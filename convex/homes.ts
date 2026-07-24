import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not found");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

async function checkDataAccess(ctx: any, dataOwnerId: Id<"users">, requiredPermission: string) {
  const currentUser = await getLoggedInUser(ctx);
  
  // If it's the owner, they have full access
  if (dataOwnerId === currentUser._id) {
    return true;
  }
  
  // Check if current user has shared access
  const access = await ctx.db
    .query("sharedAccess")
    .withIndex("by_owner_and_shared_with", (q: any) => 
      q.eq("ownerId", dataOwnerId).eq("sharedWithId", currentUser._id)
    )
    .unique();
  
  if (!access) {
    throw new Error("You don't have access to this data");
  }
  
  if (!access.permissions.includes(requiredPermission)) {
    throw new Error(`You don't have ${requiredPermission} permission for this data`);
  }
  
  return true;
}

export const list = query({
  args: {
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getLoggedInUser(ctx);
    const targetUserId = args.ownerId || currentUser._id;
    
    // Check access permissions
    await checkDataAccess(ctx, targetUserId, "homes");
    
    const homes = await ctx.db
      .query("homes")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    
    return homes;
  },
});

export const get = query({
  args: {
    id: v.id("homes"),
  },
  handler: async (ctx, args) => {
    const home = await ctx.db.get(args.id);
    if (!home) {
      return null;
    }
    
    // Check access permissions
    await checkDataAccess(ctx, home.userId, "homes");
    
    return home;
  },
});

export const create = mutation({
  args: {
    nickname: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.string(),
    propertyType: v.string(),
    ownership: v.string(),
    purchaseDate: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    mortgageProvider: v.optional(v.string()),
    mortgageBalance: v.optional(v.number()),
    insuranceProvider: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    councilTaxBand: v.optional(v.string()),
    notes: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getLoggedInUser(ctx);
    const targetUserId = args.ownerId || currentUser._id;
    
    // Check access permissions
    await checkDataAccess(ctx, targetUserId, "homes");
    
    const { ownerId, ...homeData } = args;
    
    return await ctx.db.insert("homes", {
      userId: targetUserId,
      ...homeData,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("homes"),
    nickname: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.string(),
    propertyType: v.string(),
    ownership: v.string(),
    purchaseDate: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    mortgageProvider: v.optional(v.string()),
    mortgageBalance: v.optional(v.number()),
    insuranceProvider: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    councilTaxBand: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const home = await ctx.db.get(args.id);
    if (!home) {
      throw new Error("Home not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, home.userId, "homes");
    
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    id: v.id("homes"),
  },
  handler: async (ctx, args) => {
    const home = await ctx.db.get(args.id);
    if (!home) {
      throw new Error("Home not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, home.userId, "homes");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const listForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check access permissions
    await checkDataAccess(ctx, args.userId, "homes");
    
    const homes = await ctx.db
      .query("homes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return homes;
  },
});
