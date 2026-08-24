import { useAuthActions } from "@convex-dev/auth/react";
import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function MagicLinkSignInForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setSubmitting(true);
    try {
      await signIn("magic-link", {
        email: normalizedEmail,
        redirectTo: "/people",
      });
      setSentTo(normalizedEmail);
    } catch (error) {
      console.error("Magic link request failed", error);
      toast.error("We couldn't send the sign-in link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Mail aria-hidden="true" size={19} />
        </span>
        <h3 className="font-semibold text-gray-900">Check your inbox</h3>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          We sent a one-hour sign-in link to <strong>{sentTo}</strong>.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-form-field">
      <div>
        <label
          htmlFor="magic-link-email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          id="magic-link-email"
          className="auth-input-field"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>
      <button className="auth-button" type="submit" disabled={submitting}>
        <span className="flex items-center justify-center gap-2">
          <Send aria-hidden="true" size={17} />
          {submitting ? "Sending link…" : "Email me a sign-in link"}
        </span>
      </button>
      <p className="text-center text-xs leading-5 text-gray-500">
        No password needed. The link expires after one hour.
      </p>
    </form>
  );
}
