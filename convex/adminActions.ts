import {
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const resetUserPassword = action({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) {
      throw new Error("Not authenticated");
    }

    if (args.newPassword.length < 8 || args.newPassword.length > 128) {
      throw new Error("Password must be between 8 and 128 characters");
    }

    const target = await ctx.runQuery(internal.admin.getPasswordResetContext, {
      actorId,
      userId: args.userId,
    });

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: target.email,
        secret: args.newPassword,
      },
    });

    await invalidateSessions(ctx, { userId: target.userId });
    return null;
  },
});
