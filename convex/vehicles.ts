import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { isDateOnly } from "../shared/calendarDates";

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
    await checkDataAccess(ctx, targetUserId, "vehicles");
    
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    
    return vehicles;
  },
});

export const get = query({
  args: {
    id: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      return null;
    }
    
    // Check access permissions
    await checkDataAccess(ctx, vehicle.userId, "vehicles");
    
    return vehicle;
  },
});

export const create = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    vin: v.optional(v.string()),
    registrationExpiry: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    ncbStartDate: v.optional(v.string()),
    motExpiry: v.optional(v.string()),
    serviceInterval: v.optional(v.string()),
    nextServiceDueDate: v.optional(v.string()),
    insuredAt: v.optional(v.id("homes")),
    addedToDart: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
  },
  returns: v.id("vehicles"),
  handler: async (ctx, args) => {
    const currentUser = await getLoggedInUser(ctx);
    const targetUserId = args.ownerId || currentUser._id;
    
    // Check access permissions
    await checkDataAccess(ctx, targetUserId, "vehicles");

    if (args.ncbStartDate !== undefined && !isDateOnly(args.ncbStartDate)) {
      throw new Error("NCB start date must be a valid YYYY-MM-DD date");
    }
    
    const { ownerId, ...vehicleData } = args;
    
    return await ctx.db.insert("vehicles", {
      userId: targetUserId,
      ...vehicleData,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    vin: v.optional(v.string()),
    registrationExpiry: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    ncbStartDate: v.optional(v.union(v.string(), v.null())),
    motExpiry: v.optional(v.string()),
    serviceInterval: v.optional(v.string()),
    nextServiceDueDate: v.optional(v.string()),
    insuredAt: v.optional(v.id("homes")),
    addedToDart: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, vehicle.userId, "vehicles");

    if (args.ncbStartDate != null && !isDateOnly(args.ncbStartDate)) {
      throw new Error("NCB start date must be a valid YYYY-MM-DD date");
    }
    
    const { id, ncbStartDate, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      ...(ncbStartDate !== undefined ? { ncbStartDate: ncbStartDate ?? undefined } : {}),
    });
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    id: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, vehicle.userId, "vehicles");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
