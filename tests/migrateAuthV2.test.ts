import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cli = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("node:child_process", () => ({ execFileSync: cli.run }));

const originalArgv = process.argv;
let settings: Record<string, string>;

beforeEach(() => {
  vi.resetModules();
  cli.run.mockReset();
  process.argv = [process.execPath, "scripts/migrate-auth-v2.mjs", "--deployed"];
  vi.stubEnv("VITE_CONVEX_URL", "https://test-deployment.convex.cloud");
  settings = {
    RESEND_API_KEY: "test-key",
    AUTH_EMAIL_FROM: "Life Admin <owner@example.com>",
    SITE_URL: "https://example.com",
  };
  cli.run.mockImplementation((_file: string, args: string[]) => {
    if (args[1] === "env") {
      // Match the CLI outside an AI agent, as it runs on Vercel.
      return Object.entries(settings).map(([name, value]) =>
        args.includes("--names-only") ? name : `${name}=${value}`,
      ).join("\r\n") + "\r\n";
    }
    if (args[1] === "data") return "";
    throw new Error("Unexpected migration command");
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("deployment migration environment validation", () => {
  it.each(["RESEND_API_KEY", "AUTH_RESEND_KEY"])("accepts configured deployments with %s", async (key) => {
    delete settings.RESEND_API_KEY;
    settings[key] = "test-key";
    await expect(import("../scripts/migrate-auth-v2.mjs")).resolves.toBeDefined();
    expect(cli.run).toHaveBeenCalledTimes(5);
    for (const [, args] of cli.run.mock.calls) {
      expect(args.slice(-2)).toEqual(["--deployment", "test-deployment"]);
    }
  });

  it.each(["RESEND_API_KEY", "AUTH_EMAIL_FROM", "SITE_URL"])("stops before reading data when %s is missing", async (key) => {
    delete settings[key];
    await expect(import("../scripts/migrate-auth-v2.mjs")).rejects.toThrow("Recovery requires");
    expect(cli.run).toHaveBeenCalledTimes(1);
  });
});
