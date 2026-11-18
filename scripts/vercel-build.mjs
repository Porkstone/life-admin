import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv[2] === "--capture-url") {
  // Convex runs --cmd BEFORE pushing the backend. Save only its URL here;
  // the migration must wait for the outer deploy command to succeed.
  const url = new URL(process.env.VITE_CONVEX_URL);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".convex.cloud")) {
    throw new Error("Expected the deployed Convex Cloud URL.");
  }
  writeFileSync(process.env.LIFE_ADMIN_DEPLOYMENT_FILE, url.origin, { mode: 0o600 });
} else {
  const directory = mkdtempSync(join(tmpdir(), "life-admin-deploy-"));
  const deploymentFile = join(directory, "deployment-url");
  const env = { ...process.env, LIFE_ADMIN_DEPLOYMENT_FILE: deploymentFile };
  const script = (path) => fileURLToPath(new URL(path, import.meta.url));
  const run = (args) => execFileSync(process.execPath, args, { env, stdio: "inherit" });
  try {
    run([script("../node_modules/convex/bin/main.js"), "deploy",
      "--cmd-url-env-var-name", "VITE_CONVEX_URL",
      "--cmd", "node scripts/vercel-build.mjs --capture-url"]);
    env.VITE_CONVEX_URL = readFileSync(deploymentFile, "utf8").trim();
    run([script("./migrate-auth-v2.mjs"), "--deployed"]);
    run([script("../node_modules/vite/bin/vite.js"), "build"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
