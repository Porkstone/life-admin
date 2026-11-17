import { useCompletePasswordRecovery } from "@convex-dev/auth/methods/email-password/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../convex/_generated/api";
import { authErrorMessage } from "./lib/authErrors";

export function PasswordResetPage() {
  const [params] = useSearchParams();
  const code = params.get("code");
  return <main className="min-h-screen bg-gray-50 px-4 py-16">
    <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Set a new password</h1>
      {code ? <ResetWithCode key={code} emailCode={code} /> :
        <p role="alert" className="text-red-700">This reset link is incomplete or no longer supported. Request a new link.</p>}
      <Link to="/forgot-password" className="mt-6 block text-sm text-blue-600 hover:underline">Request a new reset link</Link>
      <Link to="/" className="mt-3 block text-sm text-blue-600 hover:underline">Back to sign in</Link>
    </div>
  </main>;
}

function ResetWithCode({ emailCode }: { emailCode: string }) {
  const state = useCompletePasswordRecovery(api.auth, { emailCode });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (state.status === "loading") return <p role="status">Checking your reset link?</p>;
  if (state.status === "error") return <p role="alert" className="text-red-700">{authErrorMessage(state.userError)}</p>;
  if (state.status === "complete") return <div role="status" className="space-y-4">
    <p>Your password has been changed and you are signed in. Your other sessions have been signed out.</p>
    <Link className="auth-button block text-center" to="/people" replace>Continue to Life Admin</Link>
  </div>;
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    const result = await state.completePasswordRecovery({ newPassword: password });
    if (result.status === "error") setError(authErrorMessage(result.userError));
  }}>
    <p className="text-sm text-gray-600">Use 10?100 characters. Choose a unique password or passphrase.</p>
    <label htmlFor="new-password" className="block text-sm font-medium">New password</label>
    <input id="new-password" type="password" autoComplete="new-password" required minLength={10}
      maxLength={100} value={password} onChange={(event) => setPassword(event.target.value)}
      disabled={state.pending} className="auth-input-field" />
    <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm new password</label>
    <input id="confirm-password" type="password" autoComplete="new-password" required minLength={10}
      maxLength={100} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
      disabled={state.pending} className="auth-input-field" />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={state.pending} className="auth-button">
      {state.pending ? "Updating password?" : "Save password and sign in"}
    </button>
  </form>;
}
