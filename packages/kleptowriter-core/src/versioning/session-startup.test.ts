import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runStartupCheck } from "./session-startup.js";
import { CURRENT_VERSION, MANIFEST_SCHEMA_VERSION, STORY_SCHEMA_VERSION } from "./version.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a project directory with a .kleptowriter.json at the given version. */
async function writeManifest(
  dir: string,
  manifestVersion: number,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const manifest = {
    manifest_version: manifestVersion,
    kleptowriter_version: CURRENT_VERSION,
    name: "test-project",
    created: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
  await writeFile(join(dir, ".kleptowriter.json"), JSON.stringify(manifest, null, 2));
}

/** Create a story/story-metadata.json at the given schema version. */
async function writeStoryMetadata(
  dir: string,
  schemaVersion: number,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const storyDir = join(dir, "story");
  await mkdir(storyDir, { recursive: true });
  const metadata = {
    schemaVersion,
    version: schemaVersion * 10,
    characters: [],
    locations: [],
    ...overrides,
  };
  await writeFile(join(storyDir, "story-metadata.json"), JSON.stringify(metadata, null, 2));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runStartupCheck", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "startup-check-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns ok=true with no pending migrations for current-format project", async () => {
    await writeManifest(tmpDir, MANIFEST_SCHEMA_VERSION);
    await writeStoryMetadata(tmpDir, STORY_SCHEMA_VERSION);

    const result = await runStartupCheck(tmpDir);

    expect(result.ok).toBe(true);
    expect(result.needsMigration).toBe(false);
    expect(result.pendingMigrations).toEqual([]);
    expect(result.errors).toHaveLength(0);
  });

  it("returns needsMigration=true for old-format project (no version fields)", async () => {
    // Write manifest without manifest_version
    await writeFile(join(tmpDir, ".kleptowriter.json"), JSON.stringify({ name: "legacy" }));
    // Write story metadata without schemaVersion
    const storyDir = join(tmpDir, "story");
    await mkdir(storyDir, { recursive: true });
    await writeFile(join(storyDir, "story-metadata.json"), JSON.stringify({ characters: [] }));

    const result = await runStartupCheck(tmpDir);

    expect(result.needsMigration).toBe(true);
    expect(result.ok).toBe(false);
    // Both should need migration since both default to version 0
    expect(result.pendingMigrations.length).toBeGreaterThanOrEqual(1);
    expect(result.errors).toHaveLength(0);
  });

  it("returns needsMigration=true when manifest is behind", async () => {
    await writeManifest(tmpDir, 0); // old manifest
    await writeStoryMetadata(tmpDir, STORY_SCHEMA_VERSION); // current story

    const result = await runStartupCheck(tmpDir);

    expect(result.needsMigration).toBe(true);
    expect(result.pendingMigrations).toContain(`Manifest v0 → v${MANIFEST_SCHEMA_VERSION}`);
  });

  it("returns needsMigration=true when story schema is behind", async () => {
    await writeManifest(tmpDir, MANIFEST_SCHEMA_VERSION); // current manifest
    await writeStoryMetadata(tmpDir, 0); // old story schema

    const result = await runStartupCheck(tmpDir);

    expect(result.needsMigration).toBe(true);
    expect(result.pendingMigrations).toContain(`Story schema v0 → v${STORY_SCHEMA_VERSION}`);
  });

  it("does not crash when .kleptowriter.json is missing", async () => {
    await writeStoryMetadata(tmpDir, STORY_SCHEMA_VERSION);

    const result = await runStartupCheck(tmpDir);

    // Should still check story metadata
    expect(result.needsMigration).toBe(false);
    // Should note the missing manifest
    expect(result.errors).toContain("Could not read .kleptowriter.json");
  });

  it("does not crash when story/story-metadata.json is missing", async () => {
    await writeManifest(tmpDir, MANIFEST_SCHEMA_VERSION);

    const result = await runStartupCheck(tmpDir);

    expect(result.needsMigration).toBe(false);
    expect(result.errors).toContain("Could not read story/story-metadata.json");
  });

  it("does not crash when both files are missing", async () => {
    const result = await runStartupCheck(tmpDir);

    expect(result.errors).toContain("Could not read .kleptowriter.json");
    expect(result.errors).toContain("Could not read story/story-metadata.json");
    // Missing files are not flagged for migration
    expect(result.needsMigration).toBe(false);
  });

  it("returns currentVersion from version constants", async () => {
    await writeManifest(tmpDir, MANIFEST_SCHEMA_VERSION);
    await writeStoryMetadata(tmpDir, STORY_SCHEMA_VERSION);

    const result = await runStartupCheck(tmpDir);

    expect(result.currentVersion).toBe(CURRENT_VERSION);
  });

  it("handles manifest with non-numeric manifest_version", async () => {
    await writeFile(
      join(tmpDir, ".kleptowriter.json"),
      JSON.stringify({ manifest_version: "invalid", name: "test" }),
    );
    await writeStoryMetadata(tmpDir, STORY_SCHEMA_VERSION);

    const result = await runStartupCheck(tmpDir);

    // Non-numeric manifest_version → treated as 0 → needs migration
    expect(result.needsMigration).toBe(true);
  });
});
