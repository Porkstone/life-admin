import { identityFor, registerAuth } from "./authHelpers";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { generateAgentToken, hashAgentToken } from "../shared/agentAccess";
import type { AgentCategory } from "../shared/agentAccess";

const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);

async function fixture(
  categories: AgentCategory[] = [
    "people",
    "vehicles",
    "homes",
    "mobileContracts",
    "documents",
  ],
  identity = false,
) {
  const t = convexTest(schema, modules);
  registerAuth(t);
  const raw = generateAgentToken();
  const hash = await hashAgentToken(raw);
  const records = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "owner@example.test",
    });
    const otherId = await ctx.db.insert("users", {
      email: "other@example.test",
    });
    const anonId = await ctx.db.insert("users", { isAnonymous: true });
    const personId = await ctx.db.insert("people", {
      userId,
      firstName: "Alex",
      lastName: "Example",
      relationship: "self",
      passportNumber: "HIDDEN-PASSPORT-123",
      nationalInsuranceNumber: "HIDDEN-NI",
      nhsNumber: "HIDDEN-NHS",
      drivingLicenseNumber: "HIDDEN-LICENCE",
      lifeInsurancePolicyNumber: "HIDDEN-POLICY",
      notes: "SECRET-NOTE",
      passportExpiryDate: "2027-02-15",
    });
    const otherPersonId = await ctx.db.insert("people", {
      userId: otherId,
      firstName: "Other",
      lastName: "Person",
      relationship: "self",
    });
    const vehicleId = await ctx.db.insert("vehicles", {
      userId,
      make: "Test",
      model: "Car",
      year: 2025,
      motExpiry: "2027-02-01",
      vin: "HIDDEN-VIN",
      notes: "SECRET-NOTE",
    });
    const contractId = await ctx.db.insert("mobileContracts", {
      userId,
      provider: "Test Mobile",
      phoneNumber: "01234",
      monthlyCost: 20,
      contractType: "sim_only",
      accountUsername: "SECRET-LOGIN",
      accountPassword: "SECRET-PASSWORD",
      notes: "SECRET-NOTE",
      contractEndDate: "2027-02-02",
    });
    const fileId = await ctx.storage.store(new Blob(["SECRET-DOCUMENT"]));
    const documentId = await ctx.db.insert("documents", {
      userId,
      personId,
      documentType: "passport",
      fileName: "passport.pdf",
      fileId,
      uploadedAt: Date.now(),
    });
    const tokenId = await ctx.db.insert("agentTokens", {
      userId,
      name: "Test agent",
      tokenHash: hash,
      suffix: raw.slice(-6),
      categories,
      allowIdentityNumbers: identity,
      expiresAt: Date.now() + 86_400_000,
    });
    return {
      userId,
      otherId,
      anonId,
      personId,
      otherPersonId,
      vehicleId,
      contractId,
      documentId,
      tokenId,
    };
  });
  const owner = t.withIdentity(await identityFor(t, records.userId));
  const request = (
    input: unknown,
    token = raw,
    headers: Record<string, string> = {},
  ) =>
    t.fetch("/agent/v1/read", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(input),
    });
  return { t, raw, hash, owner, request, ...records };
}

describe("agent credential management", () => {
  it("requires a registered account and does not expose hashes in listings", async () => {
    const f = await fixture();
    const input = {
      name: "Second agent",
      tokenHash: "b".repeat(64),
      suffix: "abcdef",
      categories: ["vehicles"] as AgentCategory[],
      allowIdentityNumbers: false,
      expiresAt: Date.now() + 86_400_000,
    };
    await expect(f.t.mutation(api.agentAccess.create, input)).rejects.toThrow(
      "registered account",
    );
    await expect(
      f.t
        .withIdentity(await identityFor(f.t, f.anonId))
        .mutation(api.agentAccess.create, input),
    ).rejects.toThrow("registered account");
    const id = await f.owner.mutation(api.agentAccess.create, input);
    const result = await f.owner.query(api.agentAccess.list, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain(input.tokenHash);
    expect(result.page.find((row) => row.id === id)?.name).toBe("Second agent");
    await expect(
      f.owner.mutation(api.agentAccess.create, { ...input, categories: [] }),
    ).rejects.toThrow("category");
    await expect(
      f.owner.mutation(api.agentAccess.create, {
        ...input,
        expiresAt: Date.now() - 1,
      }),
    ).rejects.toThrow("expiry");
  });

  it("isolates connection management by owner and revokes immediately", async () => {
    const f = await fixture();
    const other = f.t.withIdentity(await identityFor(f.t, f.otherId));
    expect(
      (
        await other.query(api.agentAccess.list, {
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page,
    ).toEqual([]);
    await expect(
      other.mutation(api.agentAccess.revoke, { id: f.tokenId }),
    ).rejects.toThrow("not found");
    await f.owner.mutation(api.agentAccess.revoke, { id: f.tokenId });
    expect(
      (await f.request({ operation: "search_records", category: "people" }))
        .status,
    ).toBe(401);
    expect(
      await f.t.query(internal.agentAccess.authenticate, {
        tokenHash: f.hash,
        now: Date.now(),
      }),
    ).toBeNull();
  });
});

describe("read API security and data", () => {
  it("rejects missing, invalid, expired credentials and disallowed origins", async () => {
    const f = await fixture();
    expect((await f.t.fetch("/agent/v1/read", { method: "POST" })).status).toBe(
      401,
    );
    expect((await f.request({}, "la_" + "0".repeat(64))).status).toBe(401);
    expect(
      (await f.request({}, f.raw, { Origin: "https://untrusted.example" }))
        .status,
    ).toBe(403);
    await f.t.run((ctx) =>
      ctx.db.patch(f.tokenId, { expiresAt: Date.now() - 1 }),
    );
    expect(
      (await f.request({ operation: "search_records", category: "people" }))
        .status,
    ).toBe(401);
  });

  it("enforces category permissions and logs denials without logging input values", async () => {
    const f = await fixture(["vehicles"]);
    const response = await f.request({
      operation: "search_records",
      category: "people",
      query: "PRIVATE-QUERY",
    });
    expect(response.status).toBe(403);
    const history = await f.owner.query(api.agentAccess.history, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(history.page[0].outcome).toBe("denied");
    expect(JSON.stringify(history)).not.toMatch(/PRIVATE-QUERY|la_|tokenHash/);
  });

  it("never exposes notes, credentials, storage IDs or file URLs; hides identity numbers by default", async () => {
    const f = await fixture();
    for (const category of [
      "people",
      "vehicles",
      "mobileContracts",
      "documents",
    ] as const) {
      const response = await f.request({
        operation: "search_records",
        category,
      });
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).not.toMatch(
        /SECRET-|HIDDEN-|fileId|https?:|accountUsername|accountPassword|userId|tokenHash/,
      );
      expect(JSON.parse(text).data.records).toHaveLength(1);
    }
    const metadata = await (
      await f.request({ operation: "list_documents", personId: f.personId })
    ).json();
    expect(metadata.data.records[0].fields.fileName).toBe("passport.pdf");
    const history = await f.owner.query(api.agentAccess.history, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(history.page[0].recordIds).toContain(f.documentId);
    expect(JSON.stringify(history)).not.toMatch(
      /Example|passport.pdf|HIDDEN-|SECRET-/,
    );
  });

  it("returns identity numbers only with explicit permission and never searches hidden fields", async () => {
    const f = await fixture();
    const search = {
      operation: "search_records",
      category: "people",
      query: "HIDDEN-PASSPORT-123",
    };
    expect((await (await f.request(search)).json()).data.records).toEqual([]);
    await f.t.run((ctx) =>
      ctx.db.patch(f.tokenId, { allowIdentityNumbers: true }),
    );
    const response = await (await f.request(search)).json();
    expect(response.data.records[0].fields.passportNumber).toBe(
      "HIDDEN-PASSPORT-123",
    );
    expect(JSON.stringify(response)).not.toContain("SECRET-NOTE");
  });

  it("hides other owners' records even with IDs, document relations or injected owner parameters", async () => {
    const f = await fixture();
    expect(
      (
        await f.request({
          operation: "get_record",
          category: "people",
          recordId: f.otherPersonId,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await f.request({
          operation: "list_documents",
          personId: f.otherPersonId,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await f.request({
          operation: "get_record",
          category: "vehicles",
          recordId: f.personId,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await f.request({
          operation: "search_records",
          category: "people",
          ownerId: f.otherId,
        })
      ).status,
    ).toBe(400);
  });

  it("paginates filtered results, including empty pages, without dropping records", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      for (let i = 0; i < 3; i++)
        await ctx.db.insert("people", {
          userId: f.userId,
          firstName: `Match ${i}`,
          lastName: "Example",
          relationship: "friend",
        });
    });
    let cursor: string | null = null;
    const ids: string[] = [];
    let calls = 0;
    do {
      const response = await (
        await f.request({
          operation: "search_records",
          category: "people",
          query: "Match",
          limit: 1,
          ...(cursor ? { cursor } : {}),
        })
      ).json();
      if (calls === 0) {
        expect(response.data.records).toEqual([]);
        expect(response.data.nextCursor).toBeTruthy();
      }
      ids.push(...response.data.records.map((r: { id: string }) => r.id));
      cursor = response.data.nextCursor;
      calls++;
    } while (cursor && calls < 10);
    expect(new Set(ids).size).toBe(3);
    expect(cursor).toBeNull();
  });

  it("finds inclusive expiry dates and omits archived contracts", async () => {
    const f = await fixture();
    const input = {
      operation: "get_upcoming_expiries",
      category: "vehicles",
      from: "2027-02-01",
      through: "2027-02-28",
    };
    const result = await (await f.request(input)).json();
    expect(result.data.expiries).toEqual([
      {
        recordId: f.vehicleId,
        category: "vehicles",
        label: "Test Car 2025",
        field: "motExpiry",
        date: "2027-02-01",
      },
    ]);
    expect((await f.request({ ...input, from: "2027-02-30" })).status).toBe(
      400,
    );
    expect((await f.request({ ...input, through: "2027-01-01" })).status).toBe(
      400,
    );
    await f.t.run((ctx) => ctx.db.patch(f.contractId, { archived: true }));
    expect(
      (
        await (
          await f.request({ ...input, category: "mobileContracts" })
        ).json()
      ).data.expiries,
    ).toEqual([]);
  });

  it("rejects unsupported writes, bad pagination, oversized bodies and non-JSON bodies", async () => {
    const f = await fixture();
    expect(
      (
        await f.request({
          operation: "delete_record",
          category: "people",
          recordId: f.personId,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request({
          operation: "search_records",
          category: "people",
          limit: 1000,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request({
          operation: "search_records",
          category: "people",
          cursor: "not-a-valid-cursor",
        })
      ).status,
    ).toBe(400);
    expect((await f.request({ data: "x".repeat(17_000) })).status).toBe(400);
    expect(
      (
        await f.t.fetch("/agent/v1/read", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${f.raw}`,
            "Content-Type": "text/plain",
          },
          body: "{}",
        })
      ).status,
    ).toBe(400);
    expect(await f.t.run((ctx) => ctx.db.get(f.personId))).not.toBeNull();
  });

  it("limits reads per token and resumes in a fresh window", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.tokenId, {
        usageWindowStartedAt: Date.now(),
        usageCount: 60,
      }),
    );
    const response = await f.request({
      operation: "search_records",
      category: "people",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await f.t.run((ctx) =>
      ctx.db.patch(f.tokenId, { usageWindowStartedAt: Date.now() - 61_000 }),
    );
    expect(
      (await f.request({ operation: "search_records", category: "people" }))
        .status,
    ).toBe(200);
  });
});

describe("MCP interoperability", () => {
  it("declines standalone streams and session deletion without hanging", async () => {
    const f = await fixture();
    for (const method of ["GET", "DELETE"]) {
      const response = await f.t.fetch("/mcp", {
        method,
        headers: {
          Authorization: `Bearer ${f.raw}`,
          Accept: "text/event-stream",
        },
      });
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
    }
  });

  it("connects with the official client, lists read-only tools, reads data and rejects reads after revocation", async () => {
    const f = await fixture(["vehicles"]);
    const transport = new StreamableHTTPClientTransport(
      new URL("https://life-admin.example/mcp"),
      {
        requestInit: { headers: { Authorization: `Bearer ${f.raw}` } },
        fetch: async (input, init) => {
          const request = new Request(input, init);
          return f.t.fetch("/mcp", {
            method: request.method,
            headers: request.headers,
            body: request.method === "POST" ? await request.text() : undefined,
          });
        },
      },
    );
    const client = new Client({ name: "life-admin-test", version: "1.0.0" });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "get_record",
        "get_upcoming_expiries",
        "list_documents",
        "search_records",
      ]);
      expect(
        tools.every(
          (tool) =>
            tool.annotations?.readOnlyHint &&
            tool.annotations.destructiveHint === false,
        ),
      ).toBe(true);
      const result = await client.callTool({
        name: "search_records",
        arguments: { category: "vehicles" },
      });
      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result.structuredContent)).toContain(
        "Test Car 2025",
      );
      const denied = await client.callTool({
        name: "get_record",
        arguments: { category: "people", recordId: f.personId },
      });
      expect(denied.isError).toBe(true);
      const unknown = await client.callTool({
        name: "delete_record",
        arguments: { recordId: f.vehicleId },
      });
      expect(unknown.isError).toBe(true);
      await f.owner.mutation(api.agentAccess.revoke, { id: f.tokenId });
      await expect(
        client.callTool({
          name: "search_records",
          arguments: { category: "vehicles" },
        }),
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
});
