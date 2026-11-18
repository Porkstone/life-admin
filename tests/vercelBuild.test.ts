import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cli = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("node:child_process", () => ({ execFileSync: cli.run }));

const originalArgv = process.argv;
const buildModule = "../scripts/vercel-build.mjs";
beforeEach(() => {
  vi.resetModules();
  cli.run.mockReset();
  process.argv = [process.execPath, "scripts/vercel-build.mjs"];
  vi.stubEnv("VITE_CONVEX_URL", "https://stale-deployment.convex.cloud");
});
afterEach(() => {
  process.argv = originalArgv;
  vi.unstubAllEnvs();
});

describe("Vercel deployment sequencing", () => {
  it("captures the URL without starting the migration inside the pre-deploy hook", async () => {
    const directory = mkdtempSync(join(tmpdir(), "life-admin-build-test-"));
    const path = join(directory, "url");
    try {
      process.argv.push("--capture-url");
      vi.stubEnv("LIFE_ADMIN_DEPLOYMENT_FILE", path);
      vi.stubEnv("VITE_CONVEX_URL", "https://actual-deployment.convex.cloud");
      await import(buildModule);
      expect(readFileSync(path, "utf8")).toBe("https://actual-deployment.convex.cloud");
      expect(cli.run).not.toHaveBeenCalled();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("finishes the backend deploy before migration, then builds with the deployed URL", async () => {
    const stages: string[] = [];
    let deploymentFile = "";
    cli.run.mockImplementation((_node, args, options) => {
      deploymentFile = options.env.LIFE_ADMIN_DEPLOYMENT_FILE;
      if (args[1] === "deploy") {
        expect(args).toContain("node scripts/vercel-build.mjs --capture-url");
        writeFileSync(deploymentFile, "https://actual-deployment.convex.cloud");
        stages.push("backend deployed");
      } else {
        expect(options.env.VITE_CONVEX_URL).toBe("https://actual-deployment.convex.cloud");
        stages.push(args[1] === "--deployed" ? "migration" : "frontend build");
      }
    });
    await import(buildModule);
    expect(stages).toEqual(["backend deployed", "migration", "frontend build"]);
    expect(existsSync(deploymentFile)).toBe(false);
  });

  it.each(["deploy", "migration"])("stops and cleans up after a failed %s", async (failure) => {
    let deploymentFile = "";
    cli.run.mockImplementation((_node, args, options) => {
      deploymentFile = options.env.LIFE_ADMIN_DEPLOYMENT_FILE;
      if (args[1] === "deploy" && failure !== "deploy") {
        writeFileSync(deploymentFile, "https://actual-deployment.convex.cloud");
        return;
      }
      throw new Error("Simulated failure");
    });
    await expect(import(buildModule)).rejects.toThrow("Simulated failure");
    expect(cli.run).toHaveBeenCalledTimes(failure === "deploy" ? 1 : 2);
    expect(existsSync(deploymentFile)).toBe(false);
  });
});
