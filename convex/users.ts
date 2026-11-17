import { internalMutation, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const rejectRegistration = internalMutation({
  args: {
    method: v.object({ name: v.literal("emailPassword"), profile: v.object({}) }),
  },
  returns: v.id("users"),
  handler: async () => { throw new Error("Registration is closed"); },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(userId, {
      name: args.name,
    });

    return null;
  },
});
