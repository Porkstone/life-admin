type AuthError = {
  error: string;
  retryAfterMs?: number;
  minimumLength?: number;
  maximumLength?: number;
};

export function authErrorMessage(error: AuthError): string {
  switch (error.error) {
    case "INVALID_EMAIL": return "Enter a valid email address.";
    case "INVALID_CREDENTIALS":
    case "USER_NOT_FOUND": return "Email or password is incorrect. You can reset your password below.";
    case "RATE_LIMITED": return `Too many attempts. Try again in ${Math.max(1, Math.ceil((error.retryAfterMs ?? 60000) / 1000))} seconds.`;
    case "PASSWORD_TOO_SHORT": return `Use at least ${error.minimumLength ?? 10} characters.`;
    case "PASSWORD_TOO_LONG": return `Use no more than ${error.maximumLength ?? 100} characters.`;
    case "PASSWORD_HAS_SURROUNDING_WHITESPACE": return "Remove spaces from the start and end of your password.";
    case "PASSWORD_TOO_COMMON": return "Choose a less common password or a longer passphrase.";
    case "MISSING_SECRET": return "Open this link in the same browser where you requested it. Otherwise, request a new link here.";
    case "INVALID_CHALLENGE":
    case "INCORRECT_CODE":
    case "EXPIRED": return "This reset link is invalid, expired, or already used. Request a new link.";
    default: return "Something went wrong. Please try again, or request a new password reset link.";
  }
}
