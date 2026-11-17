import { Link } from "react-router";
import { SignInForm } from "./SignInForm";

export function EnhancedSignInForm() {
  return (
    <div className="w-full">
      <SignInForm />
      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
