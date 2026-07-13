/**
 * Integration tests for the migration lifecycle.
 *
 * 7 scenarios that exercise loadAndMigrate with real temp dirs and file I/O:
 *   1. Fresh project — no migrations run
 *   2. Old-format manifest → migration runs (backup cleaned)
 *   3. Old-format story-metadata → migration runs (backup cleaned)
 *   4. Both old-format files → both migrated transparently
 *   5. Future-format data → VersionDowngradeError
 *   6. Corrupt data → SyntaxError
 *   7. Idempotency — no re-migration on already-current data
 *
 * Uses loadAndMigrate + migration functions directly from core (no adapter imports).
 */

import { expect, test } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadAndMigrate,
  VersionRegistry,
  MANIFEST_SCHEMA_VERSION,
  STORY_SCHEMA_VERSION,
  CURRENT_VERSION,
  VersionDowngradeError,
  getSchemaVersion,
} from "@kleptowriter/kleptowriter-core";
import { manifestV0toV1, storySchemaV0toV1 } from "../versioning/migrations/v0-to-v1.js";

// ---------------------------------------------------------------------------
// Fixture content (loaded once at module scope)
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(import.meta.dirname, "../versioning/__fixtures__");

const MANIFEST_V0_RAW = readFileSync(join(FIXTURES_DIR, "manifest-v0.json"), "utf-8");
const STORY_V0_RAW = readFileSync(join(FIXTURES_DIR, "story-v0.json"), "utf-8");
const STORY_V_FUTURE_RAW = readFileSync(join(FIXTURES_DIR, "story-v-future.json"), "utf-8");
const STORY_V0_CORRUPT_RAW = readFileSync(join(FIXTURES_DIR, "story-v0-corrupt.json"), "utf-8");

// Fresh-format data (already at schema version 1)
const FRESH_MANIFEST = {
  manifest_version: 1,
  kleptowriter_version: "0.3.0",
  name: "test-project",
  created: "2025-01-01T00:00:00.000Z",
};

const FRESH_STORY = {
  schemaVersion: 1,
  version: 1,
  characters: [],
  locations: [],
  items: [],
  arcs: [],
  plotThreads: [],
  dramaticQuestions: [],
  chronology: [],
  knowledgeState: { factsByCharacter: [] },
  thematicProgression: { themes: [] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a VersionRegistry with only the manifest v0→v1 migration. */
function createManifestRegistry(): VersionRegistry {
  const r = new VersionRegistry();
  r.register({
    from: 0,
    to: 1,
    migrate: manifestV0toV1,
    description: "Manifest v0 → v1",
  });
  return r;
}

/** Create a VersionRegistry with only the story schema v0→v1 migration. */
function createStoryRegistry(): VersionRegistry {
  const r = new VersionRegistry();
  r.register({
    from: 0,
    to: 1,
    migrate: storySchemaV0toV1,
    description: "Story schema v0 → v1",
  });
  return r;
}

/** Create a VersionRegistry with both migrations registered. */
function createCombinedRegistry(): VersionRegistry {
  const r = new VersionRegistry();
  r.register({
    from: 0,
    to: 1,
    migrate: manifestV0toV1,
    description: "Manifest v0 → v1",
  });
  r.register({
    from: 0,
    to: 1,
    migrate: storySchemaV0toV1,
    description: "Story schema v0 → v1",
  });
  return r;
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), "migration-lifecycle-"));
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

/** Read the raw JSON content at path and parse it. */
function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// ============================================================================
// Test 1: Fresh project — no migrations run
// ============================================================================

test("Test 1a: Fresh-format manifest loads with no migration", async () => {
  const dir = tmpDir();
  const manifestPath = join(dir, ".kleptowriter.json");
  writeJson(manifestPath, FRESH_MANIFEST);

  const registry = createManifestRegistry();
  const { data, migrated } = await loadAndMigrate<Record<string, unknown>>(
    manifestPath,
    registry,
    MANIFEST_SCHEMA_VERSION,
  );

  // No migration ran
  expect(migrated).toBe(false);

  // Data returned correctly
  expect(data.manifest_version).toBe(1);
  expect(data.kleptowriter_version).toBe("0.3.0");
  expect(data.name).toBe("test-project");

  // File on disk is NOT modified — no .bak files, content unchanged
  const files = readdirSync(dir);
  expect(files).not.toContain(".kleptowriter.json.bak");
  expect(files).toEqual([".kleptowriter.json"]);

  const onDisk = readJson(join(dir, ".kleptowriter.json"));
  expect(onDisk).toEqual(FRESH_MANIFEST);
});

test("Test 1b: Fresh-format story metadata loads with no migration", async () => {
  const dir = tmpDir();
  mkdirSync(join(dir, "story"));
  const metaPath = join(dir, "story", "story-metadata.json");
  writeJson(metaPath, FRESH_STORY);

  const registry = createStoryRegistry();
  const { data, migrated } = await loadAndMigrate<Record<string, unknown>>(
    metaPath,
    registry,
    STORY_SCHEMA_VERSION,
  );

  expect(migrated).toBe(false);
  expect(data.schemaVersion).toBe(1);
  expect(data.version).toBe(1);

  // File on disk unchanged
  const onDisk = readJson(metaPath);
  expect(onDisk).toEqual(FRESH_STORY);

  // No .bak files in the story directory
  expect(Array.from(readdirSync(join(dir, "story")))).not.toContain("story-metadata.json.bak");
});

// ============================================================================
// Test 2: Old-format manifest → migration runs, file unchanged on disk
// ============================================================================

test("Test 2: Old-format manifest migrates to v1 in memory, backup cleaned", async () => {
  const dir = tmpDir();
  const manifestPath = join(dir, ".kleptowriter.json");
  writeFileSync(manifestPath, MANIFEST_V0_RAW);

  // Verify pre-migration state: no version fields
  const pre = readJson<Record<string, unknown>>(manifestPath);
  expect(getSchemaVersion(pre)).toBe(0);

  const registry = createManifestRegistry();
  const { data, migrated } = await loadAndMigrate<Record<string, unknown>>(
    manifestPath,
    registry,
    MANIFEST_SCHEMA_VERSION,
  );

  // Migration ran successfully
  expect(migrated).toBe(true);
  expect(data.manifest_version).toBe(1);
  expect(data.kleptowriter_version).toBe(CURRENT_VERSION);
  expect(data.name).toBe("test-project");

  // No .bak file remains after successful migration
  expect(existsSync(`${manifestPath}.bak`)).toBe(false);

  // File on disk is NOT modified — loadAndMigrate is in-memory only
  const onDisk = readJson(manifestPath);
  expect(onDisk.manifest_version).toBeUndefined();
  expect(onDisk.kleptowriter_version).toBeUndefined();
  expect(onDisk.name).toBe("test-project");
});

// ============================================================================
// Test 3: Old-format story-metadata → migration runs
// ============================================================================

test("Test 3: Old-format story metadata migrates to v1 in memory, backup cleaned", async () => {
  const dir = tmpDir();
  mkdirSync(join(dir, "story"));
  const metaPath = join(dir, "story", "story-metadata.json");
  writeFileSync(metaPath, STORY_V0_RAW);

  // Pre-migration: version is a save counter (42), no schemaVersion
  const pre = readJson<Record<string, unknown>>(metaPath);
  expect(pre.version).toBe(42);
  expect(getSchemaVersion(pre)).toBe(0);

  const registry = createStoryRegistry();
  const { data, migrated } = await loadAndMigrate<Record<string, unknown>>(
    metaPath,
    registry,
    STORY_SCHEMA_VERSION,
  );

  expect(migrated).toBe(true);
  expect(data.schemaVersion).toBe(1);

  // Original save counter preserved
  expect(data.version).toBe(42);

  // No .bak file remains
  expect(existsSync(`${metaPath}.bak`)).toBe(false);

  // File on disk is NOT modified
  const onDisk = readJson<Record<string, unknown>>(metaPath);
  expect(onDisk.schemaVersion).toBeUndefined();
});

// ============================================================================
// Test 4: Both old-format files → both migrated transparently
// ============================================================================

test("Test 4: Both old-format manifest and story metadata migrate correctly", async () => {
  const dir = tmpDir();
  mkdirSync(join(dir, "story"));

  const manifestPath = join(dir, ".kleptowriter.json");
  const metaPath = join(dir, "story", "story-metadata.json");
  writeFileSync(manifestPath, MANIFEST_V0_RAW);
  writeFileSync(metaPath, STORY_V0_RAW);

  // Use combined registry — both migrations are available
  // but each file only triggers its own migration path
  const combined = createCombinedRegistry();

  // Migrate manifest
  const manifestResult = await loadAndMigrate<Record<string, unknown>>(
    manifestPath,
    combined,
    MANIFEST_SCHEMA_VERSION,
  );
  expect(manifestResult.migrated).toBe(true);
  expect(manifestResult.data.manifest_version).toBe(1);
  expect(manifestResult.data.kleptowriter_version).toBe(CURRENT_VERSION);

  // Migrate story metadata
  const storyResult = await loadAndMigrate<Record<string, unknown>>(
    metaPath,
    combined,
    STORY_SCHEMA_VERSION,
  );
  expect(storyResult.migrated).toBe(true);
  expect(storyResult.data.schemaVersion).toBe(1);

  // No .bak files remain
  expect(existsSync(`${manifestPath}.bak`)).toBe(false);
  expect(existsSync(`${metaPath}.bak`)).toBe(false);

  // Files on disk are NOT modified
  const manifestOnDisk = readJson<Record<string, unknown>>(manifestPath);
  expect(manifestOnDisk.manifest_version).toBeUndefined();

  const storyOnDisk = readJson<Record<string, unknown>>(metaPath);
  expect(storyOnDisk.schemaVersion).toBeUndefined();
});

// ============================================================================
// Test 5: Future-format data → VersionDowngradeError
// ============================================================================

test("Test 5: Future-format story metadata throws VersionDowngradeError", async () => {
  const dir = tmpDir();
  mkdirSync(join(dir, "story"));
  const metaPath = join(dir, "story", "story-metadata.json");
  writeFileSync(metaPath, STORY_V_FUTURE_RAW);

  // Verify pre: schemaVersion is 999
  const pre = readJson<Record<string, unknown>>(metaPath);
  expect(pre.schemaVersion).toBe(999);

  const registry = createStoryRegistry();
  let caught: Error | null = null;

  try {
    await loadAndMigrate(metaPath, registry, STORY_SCHEMA_VERSION);
  } catch (err) {
    caught = err as Error;
  }

  // VersionDowngradeError is thrown
  expect(caught).toBeInstanceOf(VersionDowngradeError);
  if (caught instanceof VersionDowngradeError) {
    expect(caught.dataVersion).toBe(999);
    expect(caught.maxVersion).toBe(STORY_SCHEMA_VERSION);
    expect(caught.message).toContain("999");
  }

  // File on disk is NOT modified
  const onDisk = readJson<Record<string, unknown>>(metaPath);
  expect(onDisk.schemaVersion).toBe(999);

  // No .bak file
  expect(existsSync(`${metaPath}.bak`)).toBe(false);
});

// ============================================================================
// Test 6: Corrupt data → SyntaxError
// ============================================================================

test("Test 6: Corrupt JSON file throws SyntaxError from loadAndMigrate", async () => {
  const dir = tmpDir();
  const path = join(dir, "corrupt.json");
  writeFileSync(path, STORY_V0_CORRUPT_RAW);

  const registry = createStoryRegistry();
  let caught: Error | null = null;

  try {
    await loadAndMigrate(path, registry, STORY_SCHEMA_VERSION);
  } catch (err) {
    caught = err as Error;
  }

  // SyntaxError is thrown from JSON.parse inside loadAndMigrate
  expect(caught).toBeInstanceOf(SyntaxError);

  // No .bak file created (error happens before migration loop)
  expect(existsSync(`${path}.bak`)).toBe(false);
});

// ============================================================================
// Test 7: Idempotency — no re-migration on already-current data
// ============================================================================

test("Test 7: Already-migrated story metadata does not re-migrate on second load", async () => {
  const dir = tmpDir();
  mkdirSync(join(dir, "story"));
  const metaPath = join(dir, "story", "story-metadata.json");
  writeJson(metaPath, FRESH_STORY);

  const registry = createStoryRegistry();

  // First load
  const result1 = await loadAndMigrate<Record<string, unknown>>(
    metaPath,
    registry,
    STORY_SCHEMA_VERSION,
  );
  expect(result1.migrated).toBe(false);

  // Capture file content after first load
  const contentAfterFirst = readFileSync(metaPath, "utf-8");

  // Second load — should also report no migration
  const result2 = await loadAndMigrate<Record<string, unknown>>(
    metaPath,
    registry,
    STORY_SCHEMA_VERSION,
  );
  expect(result2.migrated).toBe(false);
  expect(result2.data.schemaVersion).toBe(1);

  // File content unchanged between loads
  const contentAfterSecond = readFileSync(metaPath, "utf-8");
  expect(contentAfterSecond).toBe(contentAfterFirst);
});
