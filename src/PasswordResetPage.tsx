import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface PasswordResetPageProps {
  token: string;
}

export function PasswordResetPage({ token }: PasswordResetPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [email, setEmail] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { signIn } = useAuthActions();
  const tokenValidation = useQuery(api.passwordReset.validateResetToken, { token });

  useEffect(() => {
    if (tokenValidation && tokenValidation.valid && !processed) {
      setEmail(tokenValidation.email || "");
      setShowLoginPrompt(true);
    }
  }, [tokenValidation, processed]);

  const handleValidateToken = async () => {
    console.log("handleValidateToken called", { isProcessing, processed });
    if (isProcessing || processed) return;
    
    setIsProcessing(true);
    
    try {
      // Token is already validated by the query, so we can proceed directly
      toast.success("Reset link validated! Please enter your new password.");
      setShowPasswordForm(true);
      setShowLoginPrompt(false);
    } catch (error) {
      console.error("Token validation error:", error);
      toast.error("Failed to validate reset link");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch("/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Try to sign up with the new password (this will update their password)
        try {
          await signIn("password", { 
            email: result.email,
            password: newPassword,
            flow: "signUp"
          });
        } catch (signUpError) {
          // If sign up fails (user already exists), try to sign in
          await signIn("password", { 
            email: result.email,
            password: newPassword,
            flow: "signIn"
          });
        }
        
        toast.success("Password reset successfully! You are now logged in.");
        setProcessed(true);
        
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsProcessing(false);
    }
  };

  if (tokenValidation === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValidation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              {tokenValidation.error}
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showPasswordForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h2>
              <p className="text-gray-600">
                Enter a new password for your account: <strong>{email}</strong>
              </p>
            </div>
            
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input-field"
                  placeholder="Enter new password"
                  disabled={isProcessing}
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input-field"
                  placeholder="Confirm new password"
                  disabled={isProcessing}
                  required
                  minLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={isProcessing}
                className="auth-button"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting Password...
                  </div>
                ) : (
                  "Reset Password & Sign In"
                )}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
              >
                ← Back to Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showLoginPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing password reset...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {isProcessing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : processed ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isProcessing ? "Validating..." : processed ? "Success!" : "Reset Password"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isProcessing 
              ? "Please wait while we validate your reset link."
              : processed
              ? "Your password has been reset successfully! Redirecting to your dashboard..."
              : `Ready to reset password for ${email}. This link can only be used once.`
            }
          </p>
          {!isProcessing && !processed && (
            <button
              onClick={handleValidateToken}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
            >
              Continue to Reset Password
            </button>
          )}
          {processed && (
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue to Dashboard
            </a>
          )}
          <div className="mt-4">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
            >
              ← Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
