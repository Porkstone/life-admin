import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  agentCategories,
  categoryLabels,
  generateAgentToken,
  hashAgentToken,
} from "../shared/agentAccess";
import type { AgentCategory } from "../shared/agentAccess";

const inputClass =
  "w-full rounded-lg border border-gray-400 bg-white px-3 py-2.5 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-600";
const date = (value: number) => new Date(value).toLocaleString();

export function AgentAccess() {
  const user = useQuery(api.auth.loggedInUser);
  if (user === undefined)
    return (
      <p role="status" className="p-6 text-gray-600">
        Loading agent access…
      </p>
    );
  if (!user || user.isAnonymous || !user.email)
    return (
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Agent access</h2>
        <p className="mt-2 text-gray-700">
          Sign in with your registered account to create agent connections.
        </p>
      </div>
    );
  return <RegisteredAgentAccess />;
}

function RegisteredAgentAccess() {
  const connections = usePaginatedQuery(
    api.agentAccess.list,
    {},
    { initialNumItems: 10 },
  );
  const history = usePaginatedQuery(
    api.agentAccess.history,
    {},
    { initialNumItems: 10 },
  );
  const endpoints = useQuery(api.agentAccess.endpoints);
  const create = useMutation(api.agentAccess.create);
  const revoke = useMutation(api.agentAccess.revoke);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<AgentCategory[]>([
    "people",
    "vehicles",
    "homes",
    "mobileContracts",
  ]);
  const [identity, setIdentity] = useState(false);
  const [days, setDays] = useState("30");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<Id<"agentTokens"> | null>(null);
  const [secret, setSecret] = useState<{
    token: string;
    id: Id<"agentTokens">;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [tab, setTab] = useState<"connections" | "history">("connections");
  const canReadIdentity =
    categories.includes("people") || categories.includes("vehicles");

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard unavailable. Select and copy the value manually.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || secret) return;
    setSaving(true);
    try {
      const token = generateAgentToken();
      const id = await create({
        name: name.trim(),
        tokenHash: await hashAgentToken(token),
        suffix: token.slice(-6),
        categories,
        allowIdentityNumbers: identity && canReadIdentity,
        expiresAt: Date.now() + Number(days) * 86_400_000,
      });
      setSecret({ token, id });
      setVisible(false);
      setName("");
      toast.success("Agent connection created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create connection",
      );
    } finally {
      setSaving(false);
    }
  };

  const revokeConnection = async (id: Id<"agentTokens">) => {
    setRevoking(id);
    try {
      await revoke({ id });
      if (secret?.id === id) setSecret(null);
      toast.success(
        "Connection revoked. Its token can no longer read your data.",
      );
    } catch {
      toast.error("Could not revoke connection. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col gap-5 rounded-2xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-600 p-3">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
              Your agents, your permissions
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Agent access
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
              Let your AI assistants look up live Life Admin records. Give each
              agent its own connection and choose exactly what it can read.
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-500 bg-emerald-950 px-3 py-2 text-xs font-semibold text-emerald-100">
          <ShieldCheck className="h-4 w-4" /> Read-only access
        </span>
      </section>

      {secret && (
        <section
          role="status"
          className="rounded-xl border-2 border-blue-600 bg-blue-50 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-blue-950">
                <KeyRound className="h-5 w-5" /> Save your new token
              </h3>
              <p className="mt-1 text-sm text-blue-950">
                Copy it to your agent’s secret store now. You cannot retrieve it
                after dismissing this panel or leaving this page.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss new token"
              onClick={() => setSecret(null)}
              className="rounded p-1 text-blue-950 hover:bg-blue-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              aria-label="New agent token"
              autoFocus
              type={visible ? "text" : "password"}
              readOnly
              value={secret.token}
              autoComplete="off"
              spellCheck={false}
              className={`${inputClass} min-w-0 flex-1 font-mono`}
            />
            <button
              type="button"
              aria-label={visible ? "Hide token" : "Show token"}
              onClick={() => setVisible(!visible)}
              className="rounded-lg border border-blue-600 p-2.5 text-blue-950"
            >
              {visible ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => copy(secret.token)}
              className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Copy className="h-4 w-4" />
              Copy token
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-300 bg-white p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-950">
            <Plus className="h-5 w-5 text-blue-700" />
            New connection
          </h3>
          <form onSubmit={submit} className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="agent-name"
                className="mb-1.5 block text-sm font-medium text-gray-900"
              >
                Agent name
              </label>
              <input
                id="agent-name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Personal assistant"
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-900">
                Data this agent can read
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {agentCategories.map((category) => (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${categories.includes(category) ? "border-blue-600 bg-blue-50 text-blue-950" : "border-gray-400 text-gray-800"}`}
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={(e) =>
                        setCategories((current) =>
                          e.target.checked
                            ? [...current, category]
                            : current.filter((c) => c !== category),
                        )
                      }
                      className="h-4 w-4 accent-blue-700"
                    />
                    {categoryLabels[category]}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                Includes contact details, home addresses, costs, and renewal
                dates within the selected categories. Documents include file
                names and metadata only.
              </p>
            </fieldset>
            <label
              className={`flex items-start gap-3 rounded-lg border border-amber-500 bg-amber-50 p-3 ${canReadIdentity ? "" : "opacity-60"}`}
            >
              <input
                type="checkbox"
                checked={identity && canReadIdentity}
                disabled={!canReadIdentity}
                onChange={(e) => setIdentity(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
              />
              <span className="text-sm text-amber-950">
                <span className="font-semibold">
                  Also allow identity numbers
                </span>
                <span className="mt-1 block text-xs leading-5">
                  Passport, driving licence, National Insurance, NHS and life
                  insurance policy numbers for People; VIN for Vehicles. Off by
                  default.
                </span>
              </span>
            </label>
            <div>
              <label
                htmlFor="agent-expiry"
                className="mb-1.5 block text-sm font-medium text-gray-900"
              >
                Expires after
              </label>
              <select
                id="agent-expiry"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className={inputClass}
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={
                saving || !name.trim() || !categories.length || Boolean(secret)
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {saving ? "Creating…" : "Create agent token"}
            </button>
            {secret && (
              <p className="text-xs text-gray-600">
                Save and dismiss the current token before creating another
                connection.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-xl border border-gray-300 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-950">
            Connect your agent
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use an MCP client that supports Streamable HTTP and a custom
            Authorization header. Configure these two values in your client.
          </p>
          <label
            htmlFor="mcp-url"
            className="mb-1.5 mt-5 block text-sm font-medium text-gray-900"
          >
            MCP server URL
          </label>
          <div className="flex gap-2">
            <input
              id="mcp-url"
              readOnly
              value={endpoints?.mcpUrl ?? ""}
              placeholder="Loading endpoint…"
              className={`${inputClass} min-w-0 font-mono text-xs`}
            />
            <button
              type="button"
              disabled={!endpoints?.mcpUrl}
              aria-label="Copy MCP server URL"
              onClick={() => endpoints?.mcpUrl && copy(endpoints.mcpUrl)}
              className="rounded-lg border border-gray-400 p-2.5 text-gray-800 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-1.5 mt-4 text-sm font-medium text-gray-900">
            Authorization header
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-6 text-slate-100">
            Authorization: Bearer YOUR_AGENT_TOKEN
          </pre>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            Store the token in your agent’s secret store. An OAuth sign-in
            connection is not available in this version.
          </p>
          <div className="mt-5 border-t border-gray-300 pt-4">
            <h4 className="text-sm font-semibold text-gray-950">
              Available tools
            </h4>
            <ul className="mt-2 space-y-2 text-sm text-gray-700">
              <li>
                <code className="font-mono text-xs text-blue-800">
                  search_records
                </code>{" "}
                — find records in a category
              </li>
              <li>
                <code className="font-mono text-xs text-blue-800">
                  get_record
                </code>{" "}
                — retrieve a record by its ID
              </li>
              <li>
                <code className="font-mono text-xs text-blue-800">
                  get_upcoming_expiries
                </code>{" "}
                — look ahead to renewals
              </li>
              <li>
                <code className="font-mono text-xs text-blue-800">
                  list_documents
                </code>{" "}
                — discover document metadata
              </li>
            </ul>
          </div>
          <details className="mt-5 rounded-lg border border-gray-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-900">
              For agents using HTTP directly
            </summary>
            <p className="mt-3 break-all font-mono text-xs text-gray-800">
              POST {endpoints?.apiUrl ?? "…"}
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Use the same Authorization header and Content-Type:
              application/json.
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-900">
              {JSON.stringify(
                {
                  operation: "get_upcoming_expiries",
                  category: "vehicles",
                  limit: 25,
                },
                null,
                2,
              )}
            </pre>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Continue with nextCursor until it is null, even after empty pages.
              Connections allow up to 60 read calls per minute.
            </p>
          </details>
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-gray-100 p-3 text-xs leading-5 text-gray-700">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Passwords, account usernames, free-text notes, document contents,
              and download links are never exposed. Revoking a token blocks
              future reads; it cannot remove data an agent has already received.
            </p>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-300 bg-white">
        <div
          className="flex gap-5 border-b border-gray-300 px-5"
          role="tablist"
          aria-label="Agent access records"
        >
          {(["connections", "history"] as const).map((value) => (
            <button
              key={value}
              id={`tab-${value}`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              onClick={() => setTab(value)}
              className={`border-b-2 py-4 text-sm font-semibold ${tab === value ? "border-blue-700 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}
            >
              {value === "connections" ? "Connections" : "Access history"}
            </button>
          ))}
        </div>
        {tab === "connections" ? (
          <div
            id="panel-connections"
            role="tabpanel"
            aria-labelledby="tab-connections"
            className="divide-y divide-gray-300"
          >
            {!connections.results.length && (
              <p className="p-6 text-sm text-gray-600">
                {connections.status === "LoadingFirstPage"
                  ? "Loading connections…"
                  : "No connections yet. Create a token to connect your first agent."}
              </p>
            )}
            {connections.results.map((connection) => {
              const status =
                connection.revokedAt !== null
                  ? "Revoked"
                  : connection.expiresAt <= now
                    ? "Expired"
                    : "Active";
              return (
                <div
                  key={connection.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-all font-semibold text-gray-950">
                        {connection.name}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status === "Active" ? "bg-emerald-100 text-emerald-900" : "bg-gray-200 text-gray-700"}`}
                      >
                        {status}
                      </span>
                      <code className="text-xs text-gray-600">
                        …{connection.suffix}
                      </code>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {connection.categories
                        .map((c) => categoryLabels[c])
                        .join(" · ")}
                    </p>
                    {connection.allowIdentityNumbers && (
                      <p className="mt-1 text-xs font-semibold text-amber-800">
                        Identity numbers enabled
                      </p>
                    )}
                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      Expires {date(connection.expiresAt)} · Last read{" "}
                      {connection.lastUsedAt === null
                        ? "never"
                        : date(connection.lastUsedAt)}
                    </p>
                  </div>
                  {connection.revokedAt === null && (
                    <button
                      type="button"
                      disabled={revoking !== null}
                      onClick={() => revokeConnection(connection.id)}
                      className="shrink-0 self-start rounded-lg border border-red-600 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {revoking === connection.id ? "Revoking…" : "Revoke"}
                    </button>
                  )}
                </div>
              );
            })}
            {connections.status !== "Exhausted" &&
              connections.status !== "LoadingFirstPage" && (
                <button
                  type="button"
                  disabled={connections.status === "LoadingMore"}
                  onClick={() => connections.loadMore(10)}
                  className="w-full p-4 text-sm font-semibold text-blue-700"
                >
                  {connections.status === "LoadingMore"
                    ? "Loading…"
                    : "Load more connections"}
                </button>
              )}
          </div>
        ) : (
          <div
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className="divide-y divide-gray-300"
          >
            <p className="px-5 py-3 text-xs leading-5 text-gray-600">
              Read activity records the tool, category, outcome and returned
              record IDs. Tokens, search text, and record values are not stored
              in this history.
            </p>
            {!history.results.length && (
              <p className="p-6 text-sm text-gray-600">
                {history.status === "LoadingFirstPage"
                  ? "Loading activity…"
                  : "No agent reads yet."}
              </p>
            )}
            {history.results.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between gap-2 p-5 sm:flex-row"
              >
                <div>
                  <p className="break-all text-sm font-semibold text-gray-950">
                    {entry.agentName}{" "}
                    <span className="font-normal text-gray-600">
                      · {categoryLabels[entry.category]}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-700">
                    <code>{entry.operation}</code> · {entry.recordIds.length}{" "}
                    record{entry.recordIds.length === 1 ? "" : "s"}
                  </p>
                  {entry.recordIds.length > 0 && (
                    <details className="mt-2 text-xs text-gray-600">
                      <summary className="cursor-pointer">Record IDs</summary>
                      <p className="mt-1 break-all font-mono">
                        {entry.recordIds.join(", ")}
                      </p>
                    </details>
                  )}
                </div>
                <div className="shrink-0 text-xs text-gray-600">
                  <p
                    className={`mb-1 flex items-center gap-1 font-semibold ${entry.outcome === "allowed" ? "text-emerald-800" : "text-amber-800"}`}
                  >
                    {entry.outcome === "allowed" && (
                      <Check className="h-3 w-3" />
                    )}
                    {entry.outcome === "allowed"
                      ? "Allowed"
                      : entry.outcome === "denied"
                        ? "Permission denied"
                        : "Not found"}
                  </p>
                  {date(entry.accessedAt)}
                </div>
              </div>
            ))}
            {history.status !== "Exhausted" &&
              history.status !== "LoadingFirstPage" && (
                <button
                  type="button"
                  disabled={history.status === "LoadingMore"}
                  onClick={() => history.loadMore(10)}
                  className="w-full p-4 text-sm font-semibold text-blue-700"
                >
                  {history.status === "LoadingMore"
                    ? "Loading…"
                    : "Load more activity"}
                </button>
              )}
          </div>
        )}
      </section>
    </div>
  );
}
