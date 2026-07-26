import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const targetUserId = args.userId || currentUserId;

    // Check if user has permission to view this data
    if (targetUserId !== currentUserId) {
      const sharedAccess = await ctx.db
        .query("sharedAccess")
        .withIndex("by_owner_and_shared_with", (q) =>
          q.eq("ownerId", targetUserId).eq("sharedWithId", currentUserId)
        )
        .first();

      if (!sharedAccess || !sharedAccess.permissions.includes("mobileContracts")) {
        throw new Error("Access denied");
      }
    }

    const contracts = await ctx.db
      .query("mobileContracts")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    // Get home details for each contract
    const contractsWithHomes = await Promise.all(
      contracts.map(async (contract) => {
        let home = null;
        if (contract.registeredAt) {
          home = await ctx.db.get(contract.registeredAt);
        }
        return {
          ...contract,
          home,
        };
      })
    );

    return contractsWithHomes;
  },
});

export const create = mutation({
  args: {
    provider: v.string(),
    phoneNumber: v.string(),
    monthlyCost: v.number(),
    contractType: v.string(),
    accountUsername: v.optional(v.string()),
    accountPassword: v.optional(v.string()),
    registeredAt: v.optional(v.id("homes")),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    dataAllowance: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("mobileContracts", {
      userId,
      ...args,
      archived: false,
    });
  },
});

export const setArchived = mutation({
  args: {
    id: v.id("mobileContracts"),
    archived: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const contract = await ctx.db.get(args.id);

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.userId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.id, { archived: args.archived });
    return null;
  },
});

export const update = mutation({
  args: {
    id: v.id("mobileContracts"),
    provider: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    monthlyCost: v.optional(v.number()),
    contractType: v.optional(v.string()),
    accountUsername: v.optional(v.string()),
    accountPassword: v.optional(v.string()),
    registeredAt: v.optional(v.id("homes")),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    dataAllowance: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { id, ...updates } = args;
    const contract = await ctx.db.get(id);
    
    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.userId !== userId) {
      throw new Error("Access denied");
    }

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    return await ctx.db.patch(id, cleanUpdates);
  },
});

export const remove = mutation({
  args: { id: v.id("mobileContracts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const contract = await ctx.db.get(args.id);
    
    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.userId !== userId) {
      throw new Error("Access denied");
    }

    return await ctx.db.delete(args.id);
  },
});
