/**
 * CLI tests — validates the runner entry point without requiring real API keys.
 *
 * Strategy:
 * - Each test runs the CLI from an isolated temp directory.
 * - Verify workspace dirs (story/scenes/, story/.pi-session/) are created under the temp cwd,
 *   NOT under the package source directory.
 */
import { test, expect, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = resolve(import.meta.dirname, "cli.ts");

const CLEANUP_DIRS: string[] = [];
afterEach(() => {
  for (const dir of CLEANUP_DIRS) {
    rmSync(dir, { recursive: true, force: true });
  }
  CLEANUP_DIRS.length = 0;
});

function tempDir(): string {
  const dir = mkdtempSync(resolve(tmpdir(), "kw-cli-test-"));
  CLEANUP_DIRS.push(dir);
  return dir;
}

test("CLI without API key prints helpful message and exits 0", async () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.OPENAI_API_KEY;

  const proc = Bun.spawn(["bun", "run", CLI_PATH], {
    env,
    cwd: tempDir(),
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  expect(output).toContain("Kleptowriter");
  expect(output).toContain("Novel Writing Harness");
  expect(output).toContain("ANTHROPIC_API_KEY");
  expect(exitCode).toBe(0);
});

test("CLI creates workspace directories under current working directory", async () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.OPENAI_API_KEY;

  const cwd = tempDir();
  const proc = Bun.spawn(["bun", "run", CLI_PATH], { env, cwd });
  await proc.exited;

  expect(existsSync(resolve(cwd, "story/scenes"))).toBe(true);
  expect(existsSync(resolve(cwd, "story/.pi-session"))).toBe(true);
});

test("CLI with dummy API key attempts session startup (no crash on init)", async () => {
  const env = { ...process.env };
  env.ANTHROPIC_API_KEY = "sk-ant-test-dummy-key-for-testing";

  const cwd = tempDir();
  const proc = Bun.spawn(["bun", "run", CLI_PATH], { env, cwd });

  const timeout = setTimeout(() => {
    proc.kill("SIGINT");
  }, 10_000);

  const output = await new Response(proc.stdout).text();
  clearTimeout(timeout);
  const _exitCode = await proc.exited;

  expect(output).toContain("Kleptowriter");
  expect(output).toContain("Initializing Pi session");
});
