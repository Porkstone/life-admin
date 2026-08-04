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

async function getUsersWithAccess(ctx: any, userId: Id<"users">) {
  // Get all users who have access to this user's data
  const sharedAccess = await ctx.db
    .query("sharedAccess")
    .withIndex("by_owner", (q: any) => q.eq("ownerId", userId))
    .collect();
  
  return [userId, ...sharedAccess.map((access: any) => access.sharedWithId)];
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

export const get = query({
  args: {
    personId: v.id("people"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.personId);
    if (!person) {
      return null;
    }
    
    // Check access permissions
    await checkDataAccess(ctx, person.userId, "people");
    
    return person;
  },
});

export const list = query({
  args: {
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getLoggedInUser(ctx);
    const targetUserId = args.ownerId || currentUser._id;
    
    // Check access permissions
    await checkDataAccess(ctx, targetUserId, "people");
    
    const people = await ctx.db
      .query("people")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
    
    return people;
  },
});

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    relationship: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    drivingLicenseNumber: v.optional(v.string()),
    drivingLicenseDate: v.optional(v.string()),
    drivingLicenseExpiryDate: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    nationalInsuranceNumber: v.optional(v.string()),
    nhsNumber: v.optional(v.string()),
    lifeInsuranceProvider: v.optional(v.string()),
    lifeInsuranceCover: v.optional(v.number()),
    lifeInsurancePolicyNumber: v.optional(v.string()),
    lifeInsuranceExpiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getLoggedInUser(ctx);
    const targetUserId = args.ownerId || currentUser._id;
    
    // Check access permissions
    await checkDataAccess(ctx, targetUserId, "people");
    
    const { ownerId, ...personData } = args;
    
    return await ctx.db.insert("people", {
      userId: targetUserId,
      ...personData,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("people"),
    firstName: v.string(),
    lastName: v.string(),
    relationship: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    drivingLicenseNumber: v.optional(v.string()),
    drivingLicenseDate: v.optional(v.string()),
    drivingLicenseExpiryDate: v.optional(v.string()),
    passportNumber: v.optional(v.string()),
    passportExpiryDate: v.optional(v.string()),
    nationalInsuranceNumber: v.optional(v.string()),
    nhsNumber: v.optional(v.string()),
    lifeInsuranceProvider: v.optional(v.string()),
    lifeInsuranceCover: v.optional(v.number()),
    lifeInsurancePolicyNumber: v.optional(v.string()),
    lifeInsuranceExpiryDate: v.optional(v.string()),
    removeLifeInsurance: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.id);
    if (!person) {
      throw new Error("Person not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, person.userId, "people");
    
    const { id, removeLifeInsurance, ...updates } = args;
    await ctx.db.patch(id, removeLifeInsurance
      ? {
          ...updates,
          lifeInsuranceProvider: undefined,
          lifeInsuranceCover: undefined,
          lifeInsurancePolicyNumber: undefined,
          lifeInsuranceExpiryDate: undefined,
        }
      : updates
    );
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    id: v.id("people"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.id);
    if (!person) {
      throw new Error("Person not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, person.userId, "people");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getAccessibleUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getLoggedInUser(ctx);
    
    // Get users whose data I have access to
    const sharedWithMe = await ctx.db
      .query("sharedAccess")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithId", currentUser._id))
      .collect();
    
    const accessibleUsers = await Promise.all(
      sharedWithMe.map(async (access) => {
        const owner = await ctx.db.get(access.ownerId);
        return {
          userId: access.ownerId,
          name: owner?.name || "Unknown User",
          email: owner?.email,
          permissions: access.permissions,
        };
      })
    );
    
    // Add current user to the list
    accessibleUsers.unshift({
      userId: currentUser._id,
      name: currentUser.name || "Me",
      email: currentUser.email,
      permissions: ["people", "vehicles", "homes", "documents"],
    });
    
    return accessibleUsers;
  },
});
