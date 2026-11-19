import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const roleValidator = v.union(v.literal("admin"), v.literal("member"));

const adminUserValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  role: roleValidator,
  isAnonymous: v.boolean(),
});

export const getAccessStatus = query({
  args: {},
  returns: v.object({
    isAdmin: v.boolean(),
    hasAdmin: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db.get(userId);
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    return {
      isAdmin: currentUser?.role === "admin",
      hasAdmin: existingAdmin !== null,
    };
  },
});

export const bootstrapAdmin = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.isAnonymous || !currentUser.email) {
      throw new Error("A registered account is required");
    }

    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdmin) {
      throw new Error("An administrator has already been configured");
    }

    await ctx.db.patch(userId, { role: "admin" });
    return null;
  },
});

export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(adminUserValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db.get(userId);
    if (currentUser?.role !== "admin") {
      throw new Error("Administrator access required");
    }

    const result = await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((user) => ({
        _id: user._id,
        _creationTime: user._creationTime,
        name: user.name ?? null,
        email: user.email ?? null,
        role: user.role ?? "member",
        isAnonymous: user.isAnonymous ?? false,
      })),
    };
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) {
      throw new Error("Not authenticated");
    }

    const actor = await ctx.db.get(actorId);
    if (actor?.role !== "admin") {
      throw new Error("Administrator access required");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found");
    }

    if (target.isAnonymous) {
      throw new Error("Anonymous users cannot be administrators");
    }

    if (target.role === args.role || (target.role === undefined && args.role === "member")) {
      return null;
    }

    if (target.role === "admin" && args.role === "member") {
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .take(2);

      if (admins.length < 2) {
        throw new Error("The last administrator cannot be removed");
      }
    }

    await ctx.db.patch(args.userId, { role: args.role });
    return null;
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) throw new Error("Not authenticated");
    const actor = await ctx.db.get(actorId);
    if (actor?.role !== "admin") throw new Error("Administrator access required");
    if (actorId === userId) throw new Error("You cannot delete your own account");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");
    if (target.role === "admin") {
      const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).take(2);
      if (admins.length < 2) throw new Error("The last administrator cannot be deleted");
    }

    // Do not silently destroy or orphan life-admin records.
    for (const table of ["people", "vehicles", "homes", "documents", "mobileContracts"] as const) {
      if (await ctx.db.query(table).withIndex("by_user", (q) => q.eq("userId", userId)).first()) {
        throw new Error("This account still owns records. Remove its records before deleting the account.");
      }
    }
    // Bound cleanup in this transaction. Throwing rolls back ALL component and
    // application changes, so an oversized account is never partially deleted.
    let deleted = 0;
    const removeRows = async (rows: { _id: Id<TableNames> }[]) => {
      if (rows.length > 100 || deleted + rows.length > 1000) {
        throw new Error("This account needs additional cleanup before it can be deleted");
      }
      deleted += rows.length;
      for (const row of rows) await ctx.db.delete(row._id);
    };
    for (const table of ["agentTokens", "agentAccessLogs", "authV2Migrations"] as const) {
      await removeRows(await ctx.db.query(table).withIndex("by_user", (q) => q.eq("userId", userId)).take(101));
    }
    await removeRows(await ctx.db.query("invites").withIndex("by_owner", (q) => q.eq("ownerId", userId)).take(101));
    await removeRows(await ctx.db.query("invites").withIndex("by_accepted_by", (q) => q.eq("acceptedBy", userId)).take(101));
    await removeRows(await ctx.db.query("sharedAccess").withIndex("by_owner", (q) => q.eq("ownerId", userId)).take(101));
    await removeRows(await ctx.db.query("sharedAccess").withIndex("by_shared_with", (q) => q.eq("sharedWithId", userId)).take(101));
    if (target.email) {
      await removeRows(await ctx.db.query("passwordResetTokens").withIndex("by_email", (q) => q.eq("email", target.email!)).take(101));
    }
    const accounts = await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).take(101);
    // Check the bound before following any child references.
    if (accounts.length > 100) throw new Error("This account needs additional cleanup before it can be deleted");
    for (const account of accounts) {
      await removeRows(await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", account._id)).take(101));
    }
    await removeRows(accounts);
    const legacySessions = await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).take(101);
    if (legacySessions.length > 100) throw new Error("This account needs additional cleanup before it can be deleted");
    for (const session of legacySessions) {
      await removeRows(await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", session._id)).take(101));
      await removeRows(await ctx.db.query("authVerifiers").withIndex("by_session", (q) => q.eq("sessionId", session._id)).take(101));
    }
    await removeRows(legacySessions);

    const sessions = await ctx.runQuery(components.auth.public.listSessions, { userId });
    await ctx.runMutation(components.auth.public.revokeSessions, { sessionIds: sessions.map((session) => session.sessionId) });
    await ctx.runMutation(components.authEmail.verifiedEmails.deleteUser, { userId });
    await ctx.db.delete(userId);
    return null;
  },
});

export const getPasswordResetContext = internalQuery({
  args: {
    actorId: v.id("users"),
    userId: v.id("users"),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await ctx.db.get(args.actorId);
    if (actor?.role !== "admin") {
      throw new Error("Administrator access required");
    }

    const user = await ctx.db.get(args.userId);
    if (!user || user.isAnonymous || !user.email) {
      throw new Error("This user does not have a password account");
    }

    return {
      userId: user._id,
      email: user.email,
    };
  },
});
