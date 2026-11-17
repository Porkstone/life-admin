import type { TestConvex } from "convex-test";
import { registerCore } from "@convex-dev/auth/test";
import type { GenericMutationCtx, AnyDataModel } from "convex/server";
import schema from "../convex/schema";

type Test = TestConvex<typeof schema>;
export function runInComponent<T>(t: Test, component: string,
  handler: (ctx: GenericMutationCtx<AnyDataModel>) => Promise<T>): Promise<T> {
  return (t as unknown as { runInComponent(component: string,
    handler: (ctx: GenericMutationCtx<AnyDataModel>) => Promise<T>): Promise<T> })
    .runInComponent(component, handler);
}
export function registerAuth(t: Test) { registerCore(t); }
export async function identityFor(t: Test, userId: string) {
  const subject = await runInComponent(t, "auth", async (ctx) => {
    const sessionId = await ctx.db.insert("sessions", { userId, component: "authPassword" });
    await ctx.db.insert("refreshTokens", {
      sessionId, hash: "test-token-" + sessionId, state: "issued",
    });
    return sessionId;
  });
  return { subject };
}
