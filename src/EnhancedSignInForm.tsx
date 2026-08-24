import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { MagicLinkSignInForm } from "./MagicLinkSignInForm";

type SignInMethod = "password" | "magic-link";

export function EnhancedSignInForm() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [method, setMethod] = useState<SignInMethod>("password");

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="w-full">
      <div
        className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1"
        role="tablist"
        aria-label="Sign-in method"
      >
        <button
          type="button"
          role="tab"
          aria-selected={method === "password"}
          onClick={() => setMethod("password")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
            method === "password"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "magic-link"}
          onClick={() => setMethod("magic-link")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
            method === "magic-link"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Email link
        </button>
      </div>

      {method === "password" ? (
        <>
          <SignInForm />
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        </>
      ) : (
        <MagicLinkSignInForm />
      )}
    </div>
  );
}
