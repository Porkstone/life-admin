import { convexTest } from "convex-test";
import { registerCore } from "@convex-dev/auth/test";
import { registerEmail } from "@convex-dev/auth/components/email/test";
import { describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, components } from "../convex/_generated/api";
import { identityFor, runInComponent } from "./authHelpers";

vi.stubEnv("CONVEX_CLOUD_URL", "https://some-deployment.convex.cloud");
const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
async function fixture() {
  const t = convexTest(schema, modules);
  registerCore(t);
  registerEmail(t);
  const adminId = await t.run((ctx) => ctx.db.insert("users", { email: "admin@example.com", role: "admin" }));
  const userId = await t.run((ctx) => ctx.db.insert("users", { email: "delete@example.com" }));
  const admin = t.withIdentity(await identityFor(t, adminId));
  return { t, admin, adminId, userId };
}

describe("Admin account deletion", () => {
  it("requires an authenticated administrator and rejects self deletion", async () => {
    const { t, admin, adminId, userId } = await fixture();
    await expect(t.mutation(api.admin.deleteUser, { userId })).rejects.toThrow("Not authenticated");
    const member = t.withIdentity(await identityFor(t, userId));
    await expect(member.mutation(api.admin.deleteUser, { userId: adminId })).rejects.toThrow("Administrator access required");
    await expect(admin.mutation(api.admin.deleteUser, { userId: adminId })).rejects.toThrow("own account");
    expect(await t.run((ctx) => ctx.db.get(adminId))).not.toBeNull();
  });

  it("preserves accounts and their owned records", async () => {
    const { t, admin, userId } = await fixture();
    const personId = await t.run((ctx) => ctx.db.insert("people", { userId, firstName: "Keep", lastName: "Me", relationship: "self" }));
    await expect(admin.mutation(api.admin.deleteUser, { userId })).rejects.toThrow("still owns records");
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get(personId))).not.toBeNull();
  });

  it("deletes the account, legacy credentials, agent access and recovery mappings, and revokes sessions", async () => {
    const { t, admin, adminId, userId } = await fixture();
    const identity = await identityFor(t, userId);
    await runInComponent(t, "authEmail", (ctx) => ctx.db.insert("verifiedEmails", {
      userId, email: "delete@example.com", normalizedEmail: "delete@example.com", isPrimary: true,
    }));
    const { accountId, sessionId, refreshId, verifierId, migrationId, tokenId } = await t.run(async (ctx) => {
      const accountId = await ctx.db.insert("authAccounts", { userId, provider: "password", providerAccountId: "delete@example.com", secret: "legacy-hash" });
      const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 10000 });
      const refreshId = await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 10000 });
      const verifierId = await ctx.db.insert("authVerifiers", { sessionId });
      const migrationId = await ctx.db.insert("authV2Migrations", { userId, migratedAt: Date.now() });
      const tokenId = await ctx.db.insert("agentTokens", { userId, name: "old agent", tokenHash: "hash", suffix: "1234", categories: [], allowIdentityNumbers: false, expiresAt: Date.now() + 10000 });
      return { accountId, sessionId, refreshId, verifierId, migrationId, tokenId };
    });
    await admin.mutation(api.admin.deleteUser, { userId });
    for (const id of [userId, accountId, sessionId, refreshId, verifierId, migrationId, tokenId]) {
      expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
    }
    expect(await t.query(components.auth.public.getSession, { sessionId: identity.subject })).toBeNull();
    expect(await runInComponent(t, "authEmail", (ctx) => ctx.db.query("verifiedEmails").collect())).toEqual([]);
    expect(await admin.query(api.auth.loggedInUser)).toMatchObject({ _id: adminId });
  });

  it("allows deleting empty anonymous accounts", async () => {
    const { t, admin, userId } = await fixture();
    await t.run((ctx) => ctx.db.patch(userId, { email: undefined, isAnonymous: true }));
    await admin.mutation(api.admin.deleteUser, { userId });
    expect(await t.run((ctx) => ctx.db.get(userId))).toBeNull();
  });

  it("rolls back cleanup when an account exceeds transaction cleanup limits", async () => {
    const { t, admin, userId } = await fixture();
    const tokenId = await t.run(async (ctx) => {
      const tokenId = await ctx.db.insert("agentTokens", { userId, name: "keep on failure", tokenHash: "hash", suffix: "1234", categories: [], allowIdentityNumbers: false, expiresAt: Date.now() + 10000 });
      for (let i = 0; i < 101; i++) {
        await ctx.db.insert("authV2Migrations", { userId, migratedAt: i });
      }
      return tokenId;
    });
    await expect(admin.mutation(api.admin.deleteUser, { userId })).rejects.toThrow("additional cleanup");
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.get(tokenId))).not.toBeNull();
    expect(await t.run((ctx) => ctx.db.query("authV2Migrations").collect())).toHaveLength(101);
  });
});
