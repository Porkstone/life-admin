import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { SignInForm } from "./SignInForm";
// import { useNavigate } from "react-router-dom";

interface InviteAcceptProps {
  token: string;
}

export function InviteAccept({ token }: InviteAcceptProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  // const navigate = useNavigate();
  
  const invite = useQuery(api.invites.getInviteByToken, { token });
  const acceptInvite = useMutation(api.invites.acceptInvite);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const handleAcceptInvite = async () => {
    if (!invite || invite.isExpired || invite.isUsed) {
      return;
    }
    
    setIsAccepting(true);
    try {
      await acceptInvite({ token });
      toast.success("Invite accepted! You now have access to the shared data.");
      // Reload the page to refresh the app state
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message || "Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  if (invite === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg border shadow-sm">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Invite</h2>
          <p className="text-gray-600">This invite link is not valid or has been deleted.</p>
        </div>
      </div>
    );
  }

  if (invite.isExpired) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg border shadow-sm">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Expired Invite</h2>
          <p className="text-gray-600">This invite link has expired.</p>
          <p className="text-sm text-gray-500 mt-2">
            Expired on: {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  if (invite.isUsed) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg border shadow-sm">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-yellow-600 mb-2">Invite Already Used</h2>
          <p className="text-gray-600">This invite link has already been accepted.</p>
          {invite.acceptedAt && (
            <p className="text-sm text-gray-500 mt-2">
              Accepted on: {new Date(invite.acceptedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <div className="max-w-md mx-auto mt-8 space-y-6">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-blue-600 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-4">
              You need to sign in to accept this invite from <strong>{invite.inviterName}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This invite will give you access to: {invite.permissions.join(", ")}
            </p>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <SignInForm />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg border shadow-sm">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-blue-600 mb-4">You're Invited!</h2>
        <p className="text-gray-600 mb-4">
          <strong>{invite.inviterName}</strong> has invited you to access their Life Admin data.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-900 mb-2">You'll get access to:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {invite.permissions.map((permission) => (
              <li key={permission}>
                • {permission.charAt(0).toUpperCase() + permission.slice(1)}
              </li>
            ))}
          </ul>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">
          This invite expires on: {new Date(invite.expiresAt).toLocaleDateString()}
        </p>
        
        <button
          onClick={handleAcceptInvite}
          disabled={isAccepting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isAccepting ? "Accepting..." : "Accept Invite"}
        </button>
      </div>
    </div>
  );
}
