import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const CLI_PATH = join(import.meta.dir, "cli.ts");

async function runCli(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", CLI_PATH, ...args], { cwd, stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

describe("version:check CLI", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `kleptowriter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("outputs correct format with current versions and exits 0", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 1 })
    );
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 1 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 1, story schema: 1\)$/);
  });

  it("outputs N/A for missing manifest and exits 1", async () => {
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 1 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: N\/A, story schema: 1\)$/);
  });

  it("outputs N/A for missing story metadata and exits 1", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 1 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 1, story schema: N\/A\)$/);
  });

  it("outputs N/A for both missing files and exits 1", async () => {
    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: N\/A, story schema: N\/A\)$/);
  });

  it("exits 1 when manifest version is old", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 0 })
    );
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 1 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 0, story schema: 1\)$/);
  });

  it("exits 1 when story schema version is old", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 1 })
    );
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 0 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 1, story schema: 0\)$/);
  });

  it("exits 1 when story schema version is future", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 1 })
    );
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 999 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 1, story schema: 999\)$/);
  });

  it("respects --project-dir argument", async () => {
    const otherDir = join(tmpdir(), `kleptowriter-test-${Date.now()}-other`);
    await mkdir(otherDir, { recursive: true });
    await mkdir(join(otherDir, "story"), { recursive: true });

    try {
      await writeFile(
        join(otherDir, ".kleptowriter.json"),
        JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", manifest_version: 1 })
      );
      await writeFile(
        join(otherDir, "story", "story-metadata.json"),
        JSON.stringify({ version: 1, schemaVersion: 1 })
      );

      const result = await runCli(["--project-dir", otherDir], testDir);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 1, story schema: 1\)$/);
    } finally {
      await rm(otherDir, { recursive: true, force: true });
    }
  });

  it("handles kleptowriter_version field in manifest", async () => {
    await writeFile(
      join(testDir, ".kleptowriter.json"),
      JSON.stringify({ name: "test", created: "2024-01-01T00:00:00.000Z", kleptowriter_version: "0.4.0" })
    );
    await writeFile(
      join(testDir, "story", "story-metadata.json"),
      JSON.stringify({ version: 1, schemaVersion: 1 })
    );

    const result = await runCli([], testDir);

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^kleptowriter v0\.4\.0 \(manifest schema: 0\.4\.0, story schema: 1\)$/);
  });
});