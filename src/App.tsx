import { useEffect, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  Car,
  House,
  Link2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { Toaster, toast } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { AdminPanel } from "./AdminPanel";
import { EnhancedSignInForm } from "./EnhancedSignInForm";
import { HomeManager } from "./HomeManager";
import { InviteAccept } from "./InviteAccept";
import { InviteManager } from "./InviteManager";
import { MobileContractManager } from "./MobileContractManager";
import { PasswordResetPage } from "./PasswordResetPage";
import { PeopleManager } from "./PeopleManager";
import { ProfileSettings } from "./ProfileSettings";
import { SignOutButton } from "./SignOutButton";
import { VehicleManager } from "./VehicleManager";

type DashboardTab =
  | "people"
  | "vehicles"
  | "homes"
  | "mobile"
  | "invites"
  | "admin";

const dashboardTabs = [
  { id: "people", label: "People", path: "/people", icon: UsersRound },
  { id: "vehicles", label: "Vehicles", path: "/vehicles", icon: Car },
  { id: "homes", label: "Homes", path: "/homes", icon: House },
  { id: "mobile", label: "Mobile", path: "/mobile", icon: Smartphone },
  {
    id: "invites",
    label: "Invites & Access",
    path: "/invites",
    icon: Link2,
  },
] satisfies Array<{
  id: Exclude<DashboardTab, "admin">;
  label: string;
  path: string;
  icon: typeof UsersRound;
}>;

export default function App() {
  return (
    <Routes>
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/reset-password/:token" element={<PasswordResetRoute />} />
      <Route path="/*" element={<DashboardShell />} />
    </Routes>
  );
}

function DashboardShell() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("reset-validated") === "true") {
      const email = urlParams.get("email");
      toast.success(
        `Reset link validated! Please sign in with your email and password.${
          email ? ` (${email})` : ""
        }`,
      );
      void navigate("/people", { replace: true });
    }
  }, [location.search, navigate]);

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

function InvitePage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return <Navigate to="/people" replace />;
  }

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
          <InviteAccept token={token} />
        </Authenticated>
        <Unauthenticated>
          <InviteAccept token={token} />
        </Unauthenticated>
      </main>
      <Toaster />
    </div>
  );
}

function PasswordResetRoute() {
  const { token } = useParams<{ token: string }>();

  return token ? (
    <PasswordResetPage token={token} />
  ) : (
    <Navigate to="/people" replace />
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
        {user?.role === "admin" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </span>
        )}
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
  const adminStatus = useQuery(
    api.admin.getAccessStatus,
    loggedInUser ? {} : "skip",
  );
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(
    null,
  );

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Authenticated>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Life Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage personal information for yourself and your contacts
          </p>
        </div>

        {adminStatus && !adminStatus.hasAdmin && <AdminBootstrapNotice />}

        <div className="mb-6">
          <nav className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {dashboardTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </NavLink>
              );
            })}

            {loggedInUser?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <Routes>
          <Route index element={<Navigate to="/people" replace />} />
          <Route
            path="people"
            element={
              <PeopleManager
                selectedUserId={selectedUserId}
                onUserChange={setSelectedUserId}
              />
            }
          />
          <Route
            path="vehicles"
            element={
              <VehicleManager
                selectedUserId={selectedUserId}
                onUserChange={setSelectedUserId}
              />
            }
          />
          <Route
            path="homes"
            element={
              <HomeManager
                selectedUserId={selectedUserId}
                onUserChange={setSelectedUserId}
              />
            }
          />
          <Route
            path="mobile"
            element={
              <MobileContractManager
                selectedUserId={selectedUserId}
                onUserChange={setSelectedUserId}
              />
            }
          />
          <Route path="invites" element={<InviteManager />} />
          <Route
            path="admin"
            element={
              loggedInUser?.role === "admin" ? (
                <AdminPanel />
              ) : (
                <Navigate to="/people" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/people" replace />} />
        </Routes>
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-64 gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Life Admin
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Organize and manage personal information for you and your loved
              ones
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

function AdminBootstrapNotice() {
  const bootstrapAdmin = useMutation(api.admin.bootstrapAdmin);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setUpAdmin = async () => {
    setIsSubmitting(true);
    try {
      await bootstrapAdmin({});
      toast.success("Administrator access established");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message.replace(/^.*?Uncaught Error:\s*/, "")
          : "Could not establish administrator access",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-amber-950">
            Set up the first administrator
          </p>
          <p className="mt-1 text-sm leading-5 text-amber-800">
            No administrator exists yet. The first registered user to claim this
            role can manage access.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={setUpAdmin}
        className="shrink-0 rounded-xl bg-amber-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Setting up…" : "Make me administrator"}
      </button>
    </div>
  );
}
