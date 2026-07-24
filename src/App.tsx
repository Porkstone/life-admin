import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { EnhancedSignInForm } from "./EnhancedSignInForm";
import { SignOutButton } from "./SignOutButton";
import { ProfileSettings } from "./ProfileSettings";
import { Toaster, toast } from "sonner";
import { PeopleManager } from "./PeopleManager";
import { VehicleManager } from "./VehicleManager";
import { HomeManager } from "./HomeManager";
import { MobileContractManager } from "./MobileContractManager";
import { InviteManager } from "./InviteManager";
import { InviteAccept } from "./InviteAccept";
import { PasswordResetPage } from "./PasswordResetPage";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if this is an invite link
    const path = window.location.pathname;
    const inviteMatch = path.match(/^\/invite\/(.+)$/);
    if (inviteMatch) {
      setInviteToken(inviteMatch[1]);
      return;
    }

    // Check if this is a password reset link
    const resetMatch = path.match(/^\/reset-password\/(.+)$/);
    if (resetMatch) {
      setResetToken(resetMatch[1]);
      return;
    }

    // Check if user returned from successful password reset
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset-validated') === 'true') {
      const email = urlParams.get('email');
      toast.success(`Reset link validated! Please sign in with your email and password.${email ? ` (${email})` : ''}`);
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // If this is a password reset link, show the reset page
  if (resetToken) {
    return <PasswordResetPage token={resetToken} />;
  }

  // If this is an invite link, show the invite accept page
  if (inviteToken) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <h2 className="text-xl font-semibold text-blue-600">Life Admin</h2>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
        </header>
        <main className="flex-1 p-4">
          <Authenticated>
            <InviteAccept token={inviteToken} />
          </Authenticated>
          <Unauthenticated>
            <InviteAccept token={inviteToken} />
          </Unauthenticated>
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-600">Life Admin</h2>
        <Authenticated>
          <HeaderActions />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function HeaderActions() {
  const user = useQuery(api.auth.loggedInUser);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowProfileSettings(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      >
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <span>{user?.name || "User"}</span>
      </button>
      <SignOutButton />
      
      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [activeTab, setActiveTab] = useState<"people" | "vehicles" | "homes" | "mobile" | "invites">("people");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Authenticated>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Life Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage personal information for yourself and your contacts
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("people")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "people"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              👥 People
            </button>
            <button
              onClick={() => setActiveTab("vehicles")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "vehicles"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🚗 Vehicles
            </button>
            <button
              onClick={() => setActiveTab("homes")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "homes"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏠 Homes
            </button>
            <button
              onClick={() => setActiveTab("mobile")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "mobile"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📱 Mobile
            </button>
            <button
              onClick={() => setActiveTab("invites")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "invites"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🔗 Invites & Access
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "people" && <PeopleManager selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />}
        {activeTab === "vehicles" && <VehicleManager selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />}
        {activeTab === "homes" && <HomeManager selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />}
        {activeTab === "mobile" && <MobileContractManager selectedUserId={selectedUserId} onUserChange={setSelectedUserId} />}
        {activeTab === "invites" && <InviteManager />}
      </Authenticated>
      
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-64 gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Life Admin</h1>
            <p className="text-xl text-gray-600 mb-8">
              Organize and manage personal information for you and your loved ones
            </p>
          </div>
          <div className="w-full max-w-md">
            <EnhancedSignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
