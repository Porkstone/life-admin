import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components } from "./_generated/api";

// Invoked by the deployment migration after importing email mappings. It is
// internal: neither a browser nor an agent token can provision an account.
export const finish = internalMutation({
  args: { userIds: v.array(v.id("users")) },
  returns: v.null(),
  handler: async (ctx, { userIds }) => {
    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (!user || user.isAnonymous) throw new Error("Invalid migration user");
      const email = await ctx.runQuery(components.authEmail.verifiedEmails.getPrimaryEmail, { userId });
      if (!email) throw new Error("Import the recovery email before finishing migration");
      await ctx.runMutation(components.auth.public.markUserIdCreated, { userId });
      const done = await ctx.db.query("authV2Migrations")
        .withIndex("by_user", (q) => q.eq("userId", userId)).unique();
      if (!done) await ctx.db.insert("authV2Migrations", { userId, migratedAt: Date.now() });
    }
    return null;
  },
});
