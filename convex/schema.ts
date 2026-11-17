import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { legacyAuthTables } from "./legacyAuthSchema";
import { agentCategory, agentOperation, agentOutcome } from "./agentValidators";

const applicationTables = {
  authV2Migrations: defineTable({
    userId: v.id("users"),
    migratedAt: v.number(),
  }).index("by_user", ["userId"]),
  agentTokens: defineTable({
    userId: v.id("users"),
    name: v.string(),
    tokenHash: v.string(),
    suffix: v.string(),
    categories: v.array(agentCategory),
    allowIdentityNumbers: v.boolean(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    usageWindowStartedAt: v.optional(v.number()),
    usageCount: v.optional(v.number()),
  }).index("by_user", ["userId"]).index("by_tokenHash", ["tokenHash"]),

  agentAccessLogs: defineTable({
    userId: v.id("users"),
    tokenId: v.id("agentTokens"),
    agentName: v.string(),
    operation: agentOperation,
    category: agentCategory,
    outcome: agentOutcome,
    recordIds: v.array(v.string()),
    accessedAt: v.number(),
  }).index("by_user", ["userId"]),

  people: defineTable({
    userId: v.id("users"), // Owner of this person record
    firstName: v.string(),
    lastName: v.string(),
    relationship: v.string(), // "self", "spouse", "child", "parent", "sibling", "friend", etc.
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
  })
    .index("by_user", ["userId"])
    .index("by_user_and_relationship", ["userId", "relationship"]),

  documents: defineTable({
    userId: v.id("users"), // Owner of this document
    personId: v.id("people"), // Person this document belongs to
    documentType: v.string(), // "passport", "driving_license", "birth_certificate", "other"
    fileName: v.string(),
    fileId: v.id("_storage"),
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_person", ["personId"])
    .index("by_user_and_person", ["userId", "personId"]),

  vehicles: defineTable({
    userId: v.id("users"), // Owner of this vehicle record
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
    serviceInterval: v.optional(v.string()), // "6 months", "12 months", "10,000 miles", etc.
    nextServiceDueDate: v.optional(v.string()),
    insuredAt: v.optional(v.id("homes")), // Home where vehicle is insured
    addedToDart: v.optional(v.boolean()), // Whether vehicle has been added to Dart
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_make", ["userId", "make"]),

  homes: defineTable({
    userId: v.id("users"), // Owner of this home record
    nickname: v.string(), // "Main Home", "Holiday Home", "Rental Property", etc.
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.string(),
    propertyType: v.string(), // "house", "apartment", "condo", "townhouse", "other"
    ownership: v.string(), // "owned", "rented", "family", "other"
    purchaseDate: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    mortgageProvider: v.optional(v.string()),
    mortgageBalance: v.optional(v.number()),
    insuranceProvider: v.optional(v.string()),
    insuranceExpiry: v.optional(v.string()),
    councilTaxBand: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_ownership", ["userId", "ownership"]),

  mobileContracts: defineTable({
    userId: v.id("users"), // Owner of this contract record
    provider: v.string(), // "EE", "O2", "Vodafone", "Three", "Giffgaff", etc.
    phoneNumber: v.string(),
    monthlyCost: v.number(),
    contractType: v.string(), // "pay_monthly", "pay_as_you_go", "sim_only"
    accountUsername: v.optional(v.string()),
    accountPassword: v.optional(v.string()),
    registeredAt: v.optional(v.id("homes")), // Home where contract is registered
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    dataAllowance: v.optional(v.string()), // "Unlimited", "50GB", etc.
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_provider", ["userId", "provider"]),

  invites: defineTable({
    ownerId: v.id("users"), // User who owns the data being shared
    inviterName: v.string(), // Name of the person sending the invite
    token: v.string(), // Unique token for the invite link
    permissions: v.array(v.string()), // ["people", "vehicles", "homes", "documents", "mobileContracts"]
    expiresAt: v.number(), // Timestamp when invite expires
    isUsed: v.boolean(), // Whether the invite has been accepted
    acceptedBy: v.optional(v.id("users")), // User who accepted the invite
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_owner", ["ownerId"])
    .index("by_accepted_by", ["acceptedBy"]),

  sharedAccess: defineTable({
    ownerId: v.id("users"), // User who owns the data
    sharedWithId: v.id("users"), // User who has access to the data
    permissions: v.array(v.string()), // ["people", "vehicles", "homes", "documents", "mobileContracts"]
    grantedAt: v.number(),
    grantedBy: v.id("users"), // User who granted the access (could be owner or someone with admin rights)
  })
    .index("by_owner", ["ownerId"])
    .index("by_shared_with", ["sharedWithId"])
    .index("by_owner_and_shared_with", ["ownerId", "sharedWithId"]),

  passwordResetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    isUsed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_email_and_used", ["email", "isUsed"]),
};

export default defineSchema({
  ...legacyAuthTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),
  ...applicationTables,
});
