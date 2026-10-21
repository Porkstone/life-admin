import { getAuthUserId } from "@convex-dev/auth/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  agentCategory,
  agentData,
  agentOutcome,
  agentReadArgs,
  agentResult,
} from "./agentValidators";
import {
  expiryFields,
  isDateOnly,
  projectAgentRecord,
} from "./agentProjection";
import type { Doc } from "./_generated/dataModel";

async function owner(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get(userId) : null;
  if (!user || user.isAnonymous || !user.email)
    throw new Error(
      "Sign in with your registered account to manage agent access.",
    );
  return user._id;
}

const tokenSummary = v.object({
  id: v.id("agentTokens"),
  name: v.string(),
  suffix: v.string(),
  categories: v.array(agentCategory),
  allowIdentityNumbers: v.boolean(),
  createdAt: v.number(),
  expiresAt: v.number(),
  revokedAt: v.union(v.number(), v.null()),
  lastUsedAt: v.union(v.number(), v.null()),
});

export const endpoints = query({
  args: {},
  returns: v.object({
    mcpUrl: v.union(v.string(), v.null()),
    apiUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    await owner(ctx);
    const base = process.env.CONVEX_SITE_URL?.replace(/\/+$/, "");
    return {
      mcpUrl: base ? `${base}/mcp` : null,
      apiUrl: base ? `${base}/agent/v1/read` : null,
    };
  },
});

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(tokenSummary),
  handler: async (ctx, { paginationOpts }) => {
    const userId = await owner(ctx);
    const result = await ctx.db
      .query("agentTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({
        ...paginationOpts,
        numItems: Math.min(50, paginationOpts.numItems),
      });
    return {
      ...result,
      page: result.page.map((t) => ({
        id: t._id,
        name: t.name,
        suffix: t.suffix,
        categories: t.categories,
        allowIdentityNumbers: t.allowIdentityNumbers,
        createdAt: t._creationTime,
        expiresAt: t.expiresAt,
        revokedAt: t.revokedAt ?? null,
        lastUsedAt: t.lastUsedAt ?? null,
      })),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tokenHash: v.string(),
    suffix: v.string(),
    categories: v.array(agentCategory),
    allowIdentityNumbers: v.boolean(),
    expiresAt: v.number(),
  },
  returns: v.id("agentTokens"),
  handler: async (ctx, args) => {
    const userId = await owner(ctx);
    const name = args.name.trim();
    if (!name || name.length > 80)
      throw new Error("Use an agent name between 1 and 80 characters.");
    if (
      !/^[a-f0-9]{64}$/.test(args.tokenHash) ||
      !/^[a-f0-9]{6}$/.test(args.suffix)
    )
      throw new Error("Invalid token format.");
    if (
      !args.categories.length ||
      new Set(args.categories).size !== args.categories.length
    )
      throw new Error("Select at least one data category.");
    if (
      args.allowIdentityNumbers &&
      !args.categories.some((c) => c === "people" || c === "vehicles")
    )
      throw new Error("Identity access needs People or Vehicles permission.");
    const now = Date.now();
    if (
      !Number.isFinite(args.expiresAt) ||
      args.expiresAt <= now ||
      args.expiresAt > now + 366 * 86_400_000
    )
      throw new Error("Choose an expiry within the next year.");
    if (
      await ctx.db
        .query("agentTokens")
        .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
        .unique()
    )
      throw new Error("Generate a fresh token.");
    return await ctx.db.insert("agentTokens", { ...args, name, userId });
  },
});

export const revoke = mutation({
  args: { id: v.id("agentTokens") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await owner(ctx);
    const token = await ctx.db.get(id);
    if (!token || token.userId !== userId)
      throw new Error("Connection not found.");
    if (!token.revokedAt) await ctx.db.patch(id, { revokedAt: Date.now() });
    return null;
  },
});

export const history = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      id: v.id("agentAccessLogs"),
      agentName: v.string(),
      operation: agentReadArgs.operation,
      category: agentCategory,
      outcome: agentOutcome,
      recordIds: v.array(v.string()),
      accessedAt: v.number(),
    }),
  ),
  handler: async (ctx, { paginationOpts }) => {
    const userId = await owner(ctx);
    const result = await ctx.db
      .query("agentAccessLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({
        ...paginationOpts,
        numItems: Math.min(50, paginationOpts.numItems),
      });
    return {
      ...result,
      page: result.page.map((row) => ({
        id: row._id,
        agentName: row.agentName,
        operation: row.operation,
        category: row.category,
        outcome: row.outcome,
        recordIds: row.recordIds,
        accessedAt: row.accessedAt,
      })),
    };
  },
});

async function findToken(
  ctx: QueryCtx | MutationCtx,
  tokenHash: string,
  now: number,
) {
  const token = await ctx.db
    .query("agentTokens")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!token || token.revokedAt !== undefined || token.expiresAt <= now)
    return null;
  const user = await ctx.db.get(token.userId);
  return user && !user.isAnonymous && user.email ? token : null;
}

export const authenticate = internalQuery({
  args: { tokenHash: v.string(), now: v.number() },
  returns: v.union(v.null(), v.object({ categories: v.array(agentCategory) })),
  handler: async (ctx, { tokenHash, now }) => {
    const token = await findToken(ctx, tokenHash, now);
    return token ? { categories: token.categories } : null;
  },
});

// Authorization, data reads, and their audit entry share a transaction. A revoke
// cannot race a separate authorization check to permit subsequent reads.
export const read = internalMutation({
  args: { tokenHash: v.string(), ...agentReadArgs },
  returns: agentResult,
  handler: async (ctx, args) => {
    const token = await findToken(ctx, args.tokenHash, Date.now());
    if (!token)
      return {
        ok: false,
        code: "unauthorized",
        message: "Token is invalid, expired, or revoked.",
      } as const;
    const now = Date.now();
    const count =
      now - (token.usageWindowStartedAt ?? 0) < 60_000
        ? (token.usageCount ?? 0)
        : 0;
    if (count >= 60)
      return {
        ok: false,
        code: "rate_limited",
        message: "Limit of 60 reads per minute reached. Retry in one minute.",
      } as const;
    await ctx.db.patch(token._id, {
      usageCount: count + 1,
      usageWindowStartedAt: count ? token.usageWindowStartedAt : now,
      lastUsedAt: now,
    });
    const category =
      args.operation === "list_documents" ? "documents" : args.category;
    if (
      !category ||
      (args.limit !== undefined &&
        (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50)) ||
      (args.query?.length ?? 0) > 160 ||
      (args.cursor?.length ?? 0) > 4096
    ) {
      return {
        ok: false,
        code: "invalid_request",
        message: "Provide a category and a limit between 1 and 50.",
      } as const;
    }
    const audit = async (
      outcome: Doc<"agentAccessLogs">["outcome"],
      recordIds: string[] = [],
    ) => {
      await ctx.db.insert("agentAccessLogs", {
        userId: token.userId,
        tokenId: token._id,
        agentName: token.name,
        operation: args.operation,
        category,
        outcome,
        recordIds,
        accessedAt: now,
      });
    };
    if (!token.categories.includes(category)) {
      await audit("denied");
      return {
        ok: false,
        code: "forbidden",
        message: "This connection cannot read that category.",
      } as const;
    }
    const empty = { records: [], expiries: [], nextCursor: null };
    let data: typeof agentData.type;
    if (args.operation === "get_record") {
      const id = args.recordId
        ? ctx.db.normalizeId(category, args.recordId)
        : null;
      const row = id ? await ctx.db.get(id) : null;
      if (!row || row.userId !== token.userId) {
        await audit("not_found");
        return {
          ok: false,
          code: "not_found",
          message: "Record not found.",
        } as const;
      }
      data = {
        ...empty,
        records: [
          projectAgentRecord(category, row, token.allowIdentityNumbers),
        ],
      };
    } else {
      let personId;
      if (args.operation === "list_documents" && args.personId) {
        personId = ctx.db.normalizeId("people", args.personId);
        const person = personId ? await ctx.db.get(personId) : null;
        if (!person || person.userId !== token.userId) {
          await audit("not_found");
          return {
            ok: false,
            code: "not_found",
            message: "Person not found.",
          } as const;
        }
      }
      const from = args.from ?? new Date(now).toISOString().slice(0, 10);
      const through =
        args.through ??
        new Date(now + 90 * 86_400_000).toISOString().slice(0, 10);
      if (
        args.operation === "get_upcoming_expiries" &&
        (!isDateOnly(from) || !isDateOnly(through) || from > through)
      ) {
        return {
          ok: false,
          code: "invalid_request",
          message:
            "Use valid YYYY-MM-DD dates, with from on or before through.",
        } as const;
      }
      const result = personId
        ? await ctx.db
            .query("documents")
            .withIndex("by_user_and_person", (q) =>
              q.eq("userId", token.userId).eq("personId", personId),
            )
            .paginate({
              numItems: args.limit ?? 25,
              cursor: args.cursor ?? null,
            })
        : await ctx.db
            .query(category)
            .withIndex("by_user", (q) => q.eq("userId", token.userId))
            .paginate({
              numItems: args.limit ?? 25,
              cursor: args.cursor ?? null,
            });
      let records = result.page.map((row) =>
        projectAgentRecord(category, row, token.allowIdentityNumbers),
      );
      if (args.operation === "search_records" && args.query?.trim()) {
        const needle = args.query.trim().toLocaleLowerCase();
        // Search only visible fields. Redacted values cannot leak through matches.
        records = records.filter((row) =>
          [row.label, ...Object.values(row.fields)].some((value) =>
            String(value).toLocaleLowerCase().includes(needle),
          ),
        );
      }
      if (args.operation === "get_upcoming_expiries") {
        records = records.filter((row) => row.fields.archived !== true);
        const expiries = records
          .flatMap((row) =>
            (expiryFields[category] ?? []).flatMap((field) => {
              const date = row.fields[field];
              return typeof date === "string" &&
                isDateOnly(date) &&
                date >= from &&
                date <= through
                ? [
                    {
                      recordId: row.id,
                      category,
                      label: row.label,
                      field,
                      date,
                    },
                  ]
                : [];
            }),
          )
          .sort((a, b) => a.date.localeCompare(b.date));
        data = {
          records: [],
          expiries,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } else {
        data = {
          ...empty,
          records,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      }
    }
    await audit("allowed", [
      ...new Set([
        ...data.records.map((r) => r.id),
        ...data.expiries.map((e) => e.recordId),
      ]),
    ]);
    return { ok: true, data } as const;
  },
});
