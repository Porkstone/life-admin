import { getAuthUserId, setupConvexAuth } from "@convex-dev/auth/server";
import { setupEmailPassword } from "@convex-dev/auth/methods/email-password/server";
import { components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

const auth = setupConvexAuth({ component: components.auth });
const siteUrl = (process.env.SITE_URL ?? "http://localhost:5173").replace(/\/+$/, "");

export const { signOut, refreshSession, isAuthenticated } = auth;

// Registration remains closed. Existing application user IDs are retained.
export const {
  signInWithEmailPassword,
  startPasswordRecovery,
  checkPasswordRecovery,
  completePasswordRecovery,
  changePassword,
} = setupEmailPassword(auth, {
  component: components.authEmail,
  passwordComponent: components.authPassword,
  emailSender: {
    kind: "resend",
    sendEmail: components.resend.lib.sendEmail,
    apiKey: process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY ?? "",
    from: process.env.AUTH_EMAIL_FROM ?? "Life Admin <onboarding@resend.dev>",
  },
  urls: {
    signUp: `${siteUrl}/`,
    changeEmail: `${siteUrl}/`,
    recovery: `${siteUrl}/reset-password`,
  },
}).attachUserCallbacks({ createUser: internal.users.rejectRegistration });

export const loggedInUser = query({
  args: {},
  returns: v.union(v.null(), v.object({
    ...schema.tables.users.validator.fields,
    _id: v.id("users"), _creationTime: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId ? await ctx.db.get(userId) : null;
  },
});
