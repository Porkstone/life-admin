import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "resend";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const emailFrom =
  process.env.AUTH_EMAIL_FROM ??
  "Life Admin <colorless-chickadee-470@convexchef.app>";

const magicLink = Email({
  id: "magic-link",
  from:
    process.env.AUTH_EMAIL_FROM ??
    "Life Admin <colorless-chickadee-470@convexchef.app>",
  maxAge: 60 * 60,
  authorize: undefined,
  async sendVerificationRequest({ identifier, url }) {
    const apiKey = process.env.CONVEX_RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("CONVEX_RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: identifier,
      subject: "Sign in to Life Admin",
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
            <h1 style="font-size: 24px; margin-bottom: 12px;">Sign in to Life Admin</h1>
            <p style="line-height: 1.6; color: #4b5563;">Use the secure link below to sign in. It expires in one hour.</p>
            <a href="${url}" style="display: inline-block; margin: 16px 0; border-radius: 8px; background: #4f46e5; color: white; padding: 12px 20px; font-weight: 600; text-decoration: none;">Sign in to Life Admin</a>
            <p style="font-size: 13px; line-height: 1.5; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        `,
      text: `Sign in to Life Admin\n\n${url}\n\nThis link expires in one hour.`,
    });

    if (error) {
      console.error("Magic link email provider error", {
        name: error.name,
        message: error.message,
      });
      throw new Error("Failed to send magic link");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, magicLink, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const db = (ctx as MutationCtx).db;
      const email =
        typeof args.profile.email === "string"
          ? args.profile.email.trim().toLowerCase()
          : undefined;
      const profile = {
        ...(typeof args.profile.name === "string"
          ? { name: args.profile.name }
          : {}),
        ...(typeof args.profile.image === "string"
          ? { image: args.profile.image }
          : {}),
        ...(email ? { email } : {}),
        ...(typeof args.profile.phone === "string"
          ? { phone: args.profile.phone }
          : {}),
        ...(typeof args.profile.isAnonymous === "boolean"
          ? { isAnonymous: args.profile.isAnonymous }
          : {}),
      };

      if (args.existingUserId) {
        await db.patch(args.existingUserId, {
          ...profile,
          ...(args.profile.emailVerified
            ? { emailVerificationTime: Date.now() }
            : {}),
          ...(args.profile.phoneVerified
            ? { phoneVerificationTime: Date.now() }
            : {}),
        });
        return args.existingUserId;
      }

      // A completed magic-link flow proves control of the email address before
      // a session is issued. Associate its pending account with the existing
      // unique password user so records and permissions keep one identity.
      if (args.type === "email" && email) {
        const matchingUsers = await db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .take(2);

        if (matchingUsers.length === 1) {
          return matchingUsers[0]._id;
        }
      }

      return await db.insert("users", profile);
    },
  },
});

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
