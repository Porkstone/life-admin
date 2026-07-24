import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Validate reset token without using it
http.route({
  path: "/validate-reset-token",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { token } = await request.json();
    
    try {
      const result = await ctx.runQuery(api.passwordReset.validateResetToken, { token });
      
      if (result.valid) {
        return new Response(JSON.stringify({ 
          success: true, 
          email: result.email,
          message: "Token is valid"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Reset password with new password
http.route({
  path: "/reset-password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { token, newPassword } = await request.json();
    
    try {
      const result = await ctx.runMutation(api.passwordReset.resetPassword, { 
        token, 
        newPassword 
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        email: result.email,
        message: "Password reset successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
