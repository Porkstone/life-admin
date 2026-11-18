import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEmailMigration } from "./auth-v2-migration.mjs";

const cli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !["--prod", "--deployed"].includes(arg))) {
  throw new Error("Use --prod, --deployed, or no arguments for the configured dev deployment.");
}
let target = args;
if (args.includes("--deployed")) {
  // Use the deployment-scoped CI key directly. A named --deployment selector
  // takes a different CLI path that requires account-level authentication.
  const hostname = new URL(process.env.VITE_CONVEX_URL).hostname;
  if (!hostname.endsWith(".convex.cloud")) throw new Error("Expected the deployed Convex Cloud URL.");
  const deployment = hostname.slice(0, -".convex.cloud".length);
  const keyTarget = process.env.CONVEX_DEPLOY_KEY?.split("|", 1)[0];
  if (!["prod", "dev"].some((type) => keyTarget === `${type}:${deployment}`)) {
    throw new Error("CONVEX_DEPLOY_KEY must be a deployment-scoped key matching VITE_CONVEX_URL. Create a deploy key for this deployment in Convex and set it in Vercel.");
  }
  target = [];
}
function run(args) {
  // Database output can contain credentials. Never print it or child errors.
  try {
    return execFileSync(process.execPath, [cli, ...args, ...target], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch { throw new Error(`Convex ${args[0]} failed during auth migration. Check deployment access and configuration.`); }
}
function rows(table, component) {
  const output = run(["data", table, "--format", "json", "--limit", "10000",
    ...(component ? ["--component", component] : [])]);
  // The CLI emits no stdout for an empty table, even with --format json.
  const data = output.trim() ? JSON.parse(output) : [];
  if (data.length >= 10000) throw new Error("Migration row limit reached; refusing a partial import.");
  return data;
}

// Request names explicitly: the default is NAME=value outside an AI agent,
// including on Vercel. Never fetch secret values just to check configuration.
const names = new Set(run(["env", "list", "--names-only"]).split(/\r?\n/).map((s) => s.trim()));
if (!(names.has("RESEND_API_KEY") || names.has("AUTH_RESEND_KEY")) ||
    !names.has("AUTH_EMAIL_FROM") || !names.has("SITE_URL")) {
  throw new Error("Recovery requires RESEND_API_KEY (or AUTH_RESEND_KEY), AUTH_EMAIL_FROM and SITE_URL on this deployment.");
}
const { additions, userIds } = buildEmailMigration({
  users: rows("users"), accounts: rows("authAccounts"),
  existing: rows("verifiedEmails", "authEmail"), completed: rows("authV2Migrations"),
});
const directory = mkdtempSync(join(tmpdir(), "life-admin-auth-v2-"));
try {
  if (additions.length) {
    const path = join(directory, "emails.json");
    writeFileSync(path, JSON.stringify(additions), { mode: 0o600 });
    // Append only missing mappings; never replace v2 passwords or email changes.
    run(["import", "--component", "authEmail", "--table", "verifiedEmails", "--append", path]);
  }
  if (userIds.length) run(["run", "authMigration:finish", JSON.stringify({ userIds })]);
  console.log(`Auth v2 migration complete: ${additions.length} recovery email mappings added; ${userIds.length} accounts checked. Existing users must set their password through email recovery.`);
} finally {
  // The verified temporary directory is ours, outside the repository.
  rmSync(directory, { recursive: true, force: true });
}
