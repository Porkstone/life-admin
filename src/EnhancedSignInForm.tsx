import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function EnhancedSignInForm() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="w-full">
      <SignInForm />
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          Forgot your password?
        </button>
      </div>
    </div>
  );
}
