import { useSignInWithEmailPassword } from "@convex-dev/auth/methods/email-password/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { authErrorMessage } from "./lib/authErrors";

export function SignInForm() {
  const { signIn, pending } = useSignInWithEmailPassword(api.auth);
  const [error, setError] = useState<string | null>(null);

  return (
    <form className="flex flex-col gap-form-field" onSubmit={async (event) => {
      event.preventDefault();
      setError(null);
      const data = new FormData(event.currentTarget);
      const email = data.get("email");
      const password = data.get("password");
      if (typeof email !== "string" || typeof password !== "string") return;
      const result = await signIn({
        email: email.trim(),
        password,
      });
      if (result.status === "error") setError(authErrorMessage(result.userError));
    }}>
      <label htmlFor="signin-email" className="text-sm font-medium">Email</label>
      <input id="signin-email" className="auth-input-field" type="email" name="email"
        autoComplete="username" required disabled={pending} />
      <label htmlFor="signin-password" className="text-sm font-medium">Password</label>
      <input id="signin-password" className="auth-input-field" type="password" name="password"
        autoComplete="current-password" required disabled={pending} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button className="auth-button" type="submit" disabled={pending}>
        {pending ? "Signing in?" : "Sign in"}
      </button>
      <p className="text-sm text-gray-600">
        Signing in for the first time since the upgrade? Use ?Forgot your password?? to set a new password.
      </p>
    </form>
  );
}
