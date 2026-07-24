import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    return user;
  },
});

export const createResetToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Invalidate any existing tokens for this email
    const existingTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email_and_used", (q) => q.eq("email", args.email).eq("isUsed", false))
      .collect();

    for (const existingToken of existingTokens) {
      await ctx.db.patch(existingToken._id, { isUsed: true });
    }

    // Create new token
    return await ctx.db.insert("passwordResetTokens", {
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
      isUsed: false,
      createdAt: Date.now(),
    });
  },
});

export const validateResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      return { valid: false, error: "Invalid token" };
    }

    if (resetToken.isUsed) {
      return { valid: false, error: "Token has already been used" };
    }

    if (resetToken.expiresAt < Date.now()) {
      return { valid: false, error: "Token has expired" };
    }

    return { valid: true, email: resetToken.email };
  },
});

export const useResetToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      throw new Error("Invalid token");
    }

    if (resetToken.isUsed) {
      throw new Error("Token has already been used");
    }

    if (resetToken.expiresAt < Date.now()) {
      throw new Error("Token has expired");
    }

    // Mark token as used
    await ctx.db.patch(resetToken._id, { isUsed: true });

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", resetToken.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return { userId: user._id, email: user.email };
  },
});

export const resetPassword = mutation({
  args: { 
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the token and get user info
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken) {
      throw new Error("Invalid token");
    }

    if (resetToken.isUsed) {
      throw new Error("Token has already been used");
    }

    if (resetToken.expiresAt < Date.now()) {
      throw new Error("Token has expired");
    }

    // Mark token as used
    await ctx.db.patch(resetToken._id, { isUsed: true });

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", resetToken.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }
    
    return { email: user.email };
  },
});


