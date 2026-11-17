import { useStartPasswordRecovery } from "@convex-dev/auth/methods/email-password/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { authErrorMessage } from "./lib/authErrors";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { startPasswordRecovery, pending } = useStartPasswordRecovery(api.auth);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{sent ? "Check your email" : "Reset your password"}</h1>
      {sent ? <div role="status" className="space-y-3 text-gray-600">
        <p>If an account exists for <strong>{email}</strong>, we have sent a password reset link.</p>
        <p>The link expires after 10 minutes. Open it in this browser, on this device.
          Check your spam folder if it has not arrived.</p>
        <button type="button" className="text-blue-600 hover:underline" onClick={() => setSent(false)}>
          Request another link
        </button>
      </div> : <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const result = await startPasswordRecovery({ email: email.trim() });
        // Keep the response generic for an unknown email.
        if (result.success || result.userError.error === "EMAIL_NOT_FOUND") setSent(true);
        else setError(authErrorMessage(result.userError));
      }}>
        <p className="text-gray-600">Enter your account email to receive a password reset link.</p>
        <label className="block text-sm font-medium" htmlFor="recovery-email">Email address</label>
        <input id="recovery-email" type="email" autoComplete="username" required
          className="auth-input-field" value={email} onChange={(event) => setEmail(event.target.value)}
          disabled={pending} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="auth-button" disabled={pending}>
          {pending ? "Sending?" : "Send reset link"}
        </button>
      </form>}
      <button type="button" onClick={onBack} className="mt-6 text-sm text-blue-600 hover:underline">
        Back to sign in
      </button>
    </div>
  );
}
