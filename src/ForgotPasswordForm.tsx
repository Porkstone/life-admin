import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const requestReset = useAction(api.emailActions.requestPasswordReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    
    try {
      await requestReset({ email: email.trim() });
      setEmailSent(true);
      toast.success("If an account exists with that email, we've sent a reset link");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              If an account exists with <strong>{email}</strong>, we've sent you a one-time login link.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={onBack}
              className="w-full px-4 py-3 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Back to Sign In
            </button>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="w-full px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
          <p className="text-gray-600">
            Enter your email address and we'll send you a one-time login link.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input-field"
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="auth-button"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
