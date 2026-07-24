"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const signInWithResetToken = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; userId: Id<"users">; email: string | undefined }> => {
    // Validate and use the reset token
    const result: { userId: Id<"users">; email: string | undefined } = await ctx.runMutation(api.passwordReset.useResetToken, { token: args.token });
    
    // Return user info - the frontend will handle the authentication
    return {
      success: true,
      userId: result.userId,
      email: result.email,
    };
  },
});
