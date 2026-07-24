"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Resend } from "resend";

// Generate a secure random token
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { email } = args;
    
    // Check if user exists with this email
    const user = await ctx.runQuery(api.passwordReset.getUserByEmail, { email });
    
    if (!user) {
      // Don't reveal whether the email exists or not for security
      return { success: true };
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // Store the reset token
    await ctx.runMutation(api.passwordReset.createResetToken, {
      email,
      token,
      expiresAt,
    });

    // Send email with reset link
    const resend = new Resend(process.env.CONVEX_RESEND_API_KEY);
    const resetUrl = `${process.env.CONVEX_SITE_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    try {
      await resend.emails.send({
        from: "Life Admin <colorless-chickadee-470@convexchef.app>",
        to: "charlie@hallville.net",
        subject: "Reset your Life Admin password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Reset Your Password</h2>
            <p>You requested a password reset for your Life Admin account.</p>
            <p>Click the link below to log in with a one-time link:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Reset Password & Login
            </a>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Failed to send reset email:", error);
      throw new Error("Failed to send reset email");
    }

    return { success: true };
  },
});
