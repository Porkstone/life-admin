import { FormEvent, useMemo, useState } from "react";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type AdminUser = {
  _id: Id<"users">;
  _creationTime: number;
  name: string | null;
  email: string | null;
  role: "admin" | "member";
  isAnonymous: boolean;
};

type ResetTarget = Pick<AdminUser, "_id" | "name" | "email">;
type RoleChange = {
  user: AdminUser;
  role: "admin" | "member";
};

export function AdminPanel() {
  const currentUser = useQuery(api.auth.loggedInUser);
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listUsers,
    {},
    { initialNumItems: 20 },
  );
  const setUserRole = useMutation(api.admin.setUserRole);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [roleChange, setRoleChange] = useState<RoleChange | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return results;
    }

    return results.filter((user) =>
      [user.name, user.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [results, search]);

  const confirmRoleChange = async () => {
    if (!roleChange) return;

    setIsChangingRole(true);
    try {
      await setUserRole({
        userId: roleChange.user._id,
        role: roleChange.role,
      });
      toast.success(
        roleChange.role === "admin"
          ? `${displayName(roleChange.user)} is now an administrator`
          : `${displayName(roleChange.user)} is now a member`,
      );
      setRoleChange(null);
    } catch (error) {
      toast.error(errorMessage(error, "Could not change this user's role"));
    } finally {
      setIsChangingRole(false);
    }
  };

  return (
    <section className="admin-shell overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.4)]">
      <div className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-8">
        <div className="admin-grid absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Restricted area
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              User administration
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Manage administrator access and securely reset account passwords.
              Password resets sign the user out of all active sessions.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300 text-slate-950">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Loaded accounts</p>
              <p className="text-xl font-semibold">{results.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search loaded users"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500">
            Only registered accounts can be promoted or reset.
          </p>
        </div>

        {status === "LoadingFirstPage" ? (
          <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <UserRound className="mb-3 h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-700">No matching users</p>
            <p className="mt-1 text-sm text-slate-500">Try a different name or email address.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(150px,0.7fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
              <span>Account</span>
              <span>Access</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredUsers.map((user) => {
                const isCurrentUser = user._id === currentUser?._id;
                const isRegistered = !user.isAnonymous && Boolean(user.email);

                return (
                  <article
                    key={user._id}
                    className="grid gap-4 px-4 py-4 transition hover:bg-slate-50/80 md:grid-cols-[minmax(0,1.5fr)_minmax(150px,0.7fr)_auto] md:items-center md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-semibold ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {user.role === "admin" ? (
                          <Crown className="h-5 w-5" />
                        ) : (
                          initials(user)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">
                            {displayName(user)}
                          </p>
                          {isCurrentUser && (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              You
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-slate-500">
                          {user.email ?? "Anonymous account"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {user.role === "admin" && <Crown className="h-3 w-3" />}
                        {user.role === "admin" ? "Administrator" : "Member"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <button
                        type="button"
                        disabled={!isRegistered}
                        onClick={() =>
                          setRoleChange({
                            user,
                            role: user.role === "admin" ? "member" : "admin",
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.role === "admin" ? (
                          <UserRound className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        {user.role === "admin" ? "Make member" : "Promote"}
                      </button>
                      <button
                        type="button"
                        disabled={!isRegistered}
                        onClick={() => setResetTarget(user)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset password
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              disabled={status === "LoadingMore"}
              onClick={() => loadMore(20)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {status === "LoadingMore" && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {status === "LoadingMore" ? "Loading users" : "Load more users"}
            </button>
          </div>
        )}
      </div>

      {resetTarget && (
        <PasswordResetDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {roleChange && (
        <ConfirmationDialog
          change={roleChange}
          isSubmitting={isChangingRole}
          onClose={() => setRoleChange(null)}
          onConfirm={confirmRoleChange}
        />
      )}
    </section>
  );
}

function PasswordResetDialog({
  user,
  onClose,
}: {
  user: ResetTarget;
  onClose: () => void;
}) {
  const resetPassword = useAction(api.adminActions.resetUserPassword);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordIsValid = password.length >= 8 && password.length <= 128;
  const passwordsMatch = password === confirmation && confirmation.length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordIsValid || !passwordsMatch) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ userId: user._id, newPassword: password });
      toast.success(`Password reset for ${displayName(user)}`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Could not reset this password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={isSubmitting ? undefined : onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Reset user password</h2>
            <p className="mt-1 text-sm text-slate-500">
              {displayName(user)} · {user.email}
            </p>
          </div>
        </div>
        <CloseButton onClick={onClose} disabled={isSubmitting} />
      </div>

      <form onSubmit={submit} className="space-y-5 px-6 py-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>The user will be signed out on every device and must use this new password.</p>
          </div>
        </div>

        <PasswordField
          id="admin-new-password"
          label="New password"
          value={password}
          onChange={setPassword}
          visible={showPassword}
          onToggleVisibility={() => setShowPassword((visible) => !visible)}
          autoFocus
        />
        <PasswordField
          id="admin-confirm-password"
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
          visible={showPassword}
        />

        <div className="flex items-center gap-2 text-xs">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${
            passwordIsValid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}>
            <Check className="h-3 w-3" />
          </span>
          <span className={passwordIsValid ? "text-emerald-800" : "text-slate-500"}>
            8–128 characters
          </span>
          <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full ${
            passwordsMatch ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}>
            <Check className="h-3 w-3" />
          </span>
          <span className={passwordsMatch ? "text-emerald-800" : "text-slate-500"}>
            Passwords match
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!passwordIsValid || !passwordsMatch || isSubmitting}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Reset password
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmationDialog({
  change,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  change: RoleChange;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const promoting = change.role === "admin";

  return (
    <Modal onClose={isSubmitting ? undefined : onClose}>
      <div className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            promoting ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}>
            {promoting ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <CloseButton onClick={onClose} disabled={isSubmitting} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">
          {promoting ? "Grant administrator access?" : "Remove administrator access?"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {promoting
            ? `${displayName(change.user)} will be able to manage roles and reset passwords for every registered user.`
            : `${displayName(change.user)} will lose access to this administration area.`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {promoting ? "Grant access" : "Remove access"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          minLength={8}
          maxLength={128}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
        />
        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

function CloseButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

function displayName(user: Pick<AdminUser, "name" | "email">) {
  return user.name?.trim() || user.email || "Unnamed user";
}

function initials(user: Pick<AdminUser, "name" | "email">) {
  const value = displayName(user);
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message.replace(/^.*?Uncaught Error:\s*/, "") : fallback;
}
