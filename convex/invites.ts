import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createInvite = mutation({
  args: {
    permissions: v.array(v.string()),
    expiresInDays: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    
    const token = generateInviteToken();
    const expiresAt = Date.now() + (args.expiresInDays * 24 * 60 * 60 * 1000);
    
    const inviteId = await ctx.db.insert("invites", {
      ownerId: user._id,
      inviterName: user.name || "Unknown User",
      token,
      permissions: args.permissions,
      expiresAt,
      isUsed: false,
    });
    
    return { inviteId, token };
  },
});

export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    
    if (!invite) {
      return null;
    }
    
    // Check if invite is expired
    if (invite.expiresAt < Date.now()) {
      return { ...invite, isExpired: true };
    }
    
    return { ...invite, isExpired: false };
  },
});

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    
    if (!invite) {
      throw new Error("Invite not found");
    }
    
    if (invite.isUsed) {
      throw new Error("Invite has already been used");
    }
    
    if (invite.expiresAt < Date.now()) {
      throw new Error("Invite has expired");
    }
    
    if (invite.ownerId === user._id) {
      throw new Error("You cannot accept your own invite");
    }
    
    // Check if access already exists
    const existingAccess = await ctx.db
      .query("sharedAccess")
      .withIndex("by_owner_and_shared_with", (q) => 
        q.eq("ownerId", invite.ownerId).eq("sharedWithId", user._id)
      )
      .unique();
    
    if (existingAccess) {
      // Update existing permissions
      await ctx.db.patch(existingAccess._id, {
        permissions: invite.permissions,
        grantedAt: Date.now(),
        grantedBy: invite.ownerId,
      });
    } else {
      // Create new shared access
      await ctx.db.insert("sharedAccess", {
        ownerId: invite.ownerId,
        sharedWithId: user._id,
        permissions: invite.permissions,
        grantedAt: Date.now(),
        grantedBy: invite.ownerId,
      });
    }
    
    // Mark invite as used
    await ctx.db.patch(invite._id, {
      isUsed: true,
      acceptedBy: user._id,
      acceptedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const listMyInvites = query({
  args: {},
  handler: async (ctx) => {
    const user = await getLoggedInUser(ctx);
    
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    
    return invites.map(invite => ({
      ...invite,
      isExpired: invite.expiresAt < Date.now(),
    }));
  },
});

export const listSharedAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getLoggedInUser(ctx);
    
    // Get people who have access to my data
    const sharedWithOthers = await ctx.db
      .query("sharedAccess")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    
    // Get data I have access to from others
    const sharedWithMe = await ctx.db
      .query("sharedAccess")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithId", user._id))
      .collect();
    
    // Get user details for shared access
    const sharedWithOthersWithUsers = await Promise.all(
      sharedWithOthers.map(async (access) => {
        const sharedUser = await ctx.db.get(access.sharedWithId);
        return {
          ...access,
          sharedUser: sharedUser ? { name: sharedUser.name, email: sharedUser.email } : null,
        };
      })
    );
    
    const sharedWithMeWithUsers = await Promise.all(
      sharedWithMe.map(async (access) => {
        const ownerUser = await ctx.db.get(access.ownerId);
        return {
          ...access,
          ownerUser: ownerUser ? { name: ownerUser.name, email: ownerUser.email } : null,
        };
      })
    );
    
    return {
      sharedWithOthers: sharedWithOthersWithUsers,
      sharedWithMe: sharedWithMeWithUsers,
    };
  },
});

export const revokeAccess = mutation({
  args: {
    accessId: v.id("sharedAccess"),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    
    const access = await ctx.db.get(args.accessId);
    if (!access) {
      throw new Error("Access record not found");
    }
    
    // Only the owner can revoke access
    if (access.ownerId !== user._id) {
      throw new Error("You can only revoke access to your own data");
    }
    
    await ctx.db.delete(args.accessId);
    return { success: true };
  },
});

export const deleteInvite = mutation({
  args: {
    inviteId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const user = await getLoggedInUser(ctx);
    
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }
    
    // Only the owner can delete their invites
    if (invite.ownerId !== user._id) {
      throw new Error("You can only delete your own invites");
    }
    
    await ctx.db.delete(args.inviteId);
    return { success: true };
  },
});
