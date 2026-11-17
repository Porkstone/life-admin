import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { registerCore, sessionIdentity } from "@convex-dev/auth/test";
import { registerEmail, registerResendStub, sentEmails } from "@convex-dev/auth/components/email/test";
import { registerPassword } from "@convex-dev/auth/components/password/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { identityFor, runInComponent } from "./authHelpers";
import { buildEmailMigration } from "../scripts/auth-v2-migration.mjs";

// The flow tests exercise real v2 methods/components. Replace only the WASM
// hashing primitive (which Vitest's Node runner cannot load).
vi.mock("password-hash-wasm/argon2id", () => ({
  hashPassword: async (password: string) => "test-hash:" + password,
  verifyPassword: async (password: string, hash: string) => hash === "test-hash:" + password,
}));

vi.stubEnv("CONVEX_CLOUD_URL", "https://some-deployment.convex.cloud");

const modules = import.meta.glob(["../convex/**/*.{ts,js}", "!../convex/**/*.d.ts"]);
async function fixture() {
  const t = convexTest(schema, modules);
  registerCore(t);
  registerEmail(t);
  registerPassword(t);
  registerResendStub(t);
  const userId = await t.run((ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
  await runInComponent(t, "authEmail", (ctx) => ctx.db.insert("verifiedEmails", {
    userId, email: "owner@example.com", normalizedEmail: "owner@example.com", isPrimary: true,
  }));
  await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(internal.authMigration.finish, { userIds: [userId] });
  return { t, userId };
}
async function start(t: Awaited<ReturnType<typeof fixture>>["t"]) {
  const result = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.startPasswordRecovery, { email: "owner@example.com" });
  if (!result.success) throw new Error(result.userError.error);
  const emails = await sentEmails(t);
  const message = emails.filter((email) => email.subject === "Reset your password").at(-1)!;
  expect(message.to).toEqual(["owner@example.com"]);
  const url = message.text!.match(/https?:\/\/[^\s]+/)![0];
  expect(new URL(url).pathname).toBe("/reset-password");
  return { browserSecret: result.browserSecret, emailCode: new URL(url).searchParams.get("code")! };
}

describe("Auth v2 password recovery", () => {
  it("sets the first v2 password, preserves ownership, revokes old sessions and rejects link reuse", async () => {
    const { t, userId } = await fixture();
    const old = t.withIdentity(await identityFor(t, userId));
    expect((await old.query(api.auth.loggedInUser))?._id).toBe(userId);
    const proof = await start(t);
    expect(await t.query(api.auth.checkPasswordRecovery, proof)).toEqual({ success: true });
    const short = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.completePasswordRecovery, { ...proof, newPassword: "short" });
    expect(short.status).toBe("error");
    expect(await t.query(api.auth.checkPasswordRecovery, proof)).toEqual({ success: true });
    const result = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.completePasswordRecovery, { ...proof, newPassword: "A unique recovery phrase 9472" });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") throw new Error("Recovery failed");
    const recovered = t.withIdentity(sessionIdentity(result.tokens));
    expect((await recovered.query(api.auth.loggedInUser))?._id).toBe(userId);
    expect(await old.query(api.auth.loggedInUser)).toBeNull();
    const replay = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.completePasswordRecovery, { ...proof, newPassword: "Another unique phrase 9472" });
    expect(replay.status).toBe("error");
    const login = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.signInWithEmailPassword, { email: "OWNER@example.com", password: "A unique recovery phrase 9472" });
    expect(login.status).toBe("complete");
    const bad = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.signInWithEmailPassword, { email: "owner@example.com", password: "The wrong password 9472" });
    expect(bad.status).toBe("error");
  });
  it("rejects a wrong browser secret, tampered code, and expired links without changing a password", async () => {
    const { t } = await fixture();
    const proof = await start(t);
    expect((await t.query(api.auth.checkPasswordRecovery, { ...proof, browserSecret: "wrong-browser" })).success).toBe(false);
    expect((await t.query(api.auth.checkPasswordRecovery, { ...proof, emailCode: "tampered" })).success).toBe(false);
    await runInComponent(t, "authEmail", async (ctx) => {
      for (const challenge of await ctx.db.query("challenges").collect()) {
        await ctx.db.patch(challenge._id, { expiresAt: Date.now() - 1 });
      }
    });
    const result = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.completePasswordRecovery, { ...proof, newPassword: "A unique recovery phrase 9472" });
    expect(result.status).toBe("error");
  });
  it("keeps registration closed and never sends recovery mail to an unknown address", async () => {
    const { t } = await fixture();
    await expect(t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(internal.users.rejectRegistration, { method: { name: "emailPassword", profile: {} } })).rejects.toThrow("Registration is closed");
    const result = await t.withRequestMetadata({ ip: "127.0.0.1" }).mutation(api.auth.startPasswordRecovery, { email: "unknown@example.com" });
    expect(result.success).toBe(false);
    expect(await sentEmails(t)).toHaveLength(0);
  });
});

describe("Auth v2 account migration", () => {
  const user = { _id: "original-user", email: "Owner@Example.com" };
  const account = { userId: user._id, provider: "password", secret: "legacy-credential-never-copied" };
  const input = { users: [user], accounts: [account], existing: [], completed: [] };
  it("preserves user IDs, normalizes emails and copies no credentials", () => {
    const result = buildEmailMigration(input);
    expect(result.additions).toEqual([{ userId: user._id, email: user.email, normalizedEmail: "owner@example.com", isPrimary: true }]);
    expect(JSON.stringify(result)).not.toContain(account.secret);
  });
  it("is repeatable and leaves changed v2 email mappings and passwords alone", () => {
    expect(buildEmailMigration({ ...input, completed: [{ userId: user._id }] }).additions).toEqual([]);
    expect(buildEmailMigration({ ...input, existing: [{ userId: user._id, normalizedEmail: "new@example.com" }] }).additions).toEqual([]);
  });
  it("refuses conflicting ownership and ignores anonymous accounts", () => {
    expect(() => buildEmailMigration({ ...input, users: [user, { ...user, _id: "duplicate" }], accounts: [account, { ...account, userId: "duplicate" }] })).toThrow("Duplicate legacy emails");
    expect(() => buildEmailMigration({ ...input, existing: [{ userId: "another-user", normalizedEmail: "owner@example.com" }] })).toThrow("another v2 account");
    expect(buildEmailMigration({ ...input, users: [{ ...user, isAnonymous: true }] }).additions).toEqual([]);
  });
});
