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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getLoggedInUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    personId: v.id("people"),
    documentType: v.string(),
    fileName: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.personId);
    if (!person) {
      throw new Error("Person not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, person.userId, "documents");
    
    return await ctx.db.insert("documents", {
      userId: person.userId,
      personId: args.personId,
      documentType: args.documentType,
      fileName: args.fileName,
      fileId: args.fileId,
      uploadedAt: Date.now(),
    });
  },
});

export const listByPerson = query({
  args: {
    personId: v.id("people"),
  },
  handler: async (ctx, args) => {
    const person = await ctx.db.get(args.personId);
    if (!person) {
      throw new Error("Person not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, person.userId, "documents");
    
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .collect();
    
    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.fileId),
      }))
    );
  },
});

export const remove = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }
    
    // Check access permissions
    await checkDataAccess(ctx, document.userId, "documents");
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
