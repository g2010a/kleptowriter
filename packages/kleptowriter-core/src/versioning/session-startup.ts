/**
 * Startup version check for Kleptowriter projects.
 *
 * Non-blocking check — reads the project manifest and story metadata files,
 * compares their schema versions against the current expected versions, and
 * reports whether migration is needed. Does NOT run migrations.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MANIFEST_SCHEMA_VERSION, STORY_SCHEMA_VERSION, CURRENT_VERSION } from "./version.js";

export interface StartupCheckResult {
  ok: boolean;
  currentVersion: string;
  needsMigration: boolean;
  pendingMigrations: string[];
  errors: string[];
}

/**
 * Check whether the project at `projectDir` needs schema migrations.
 *
 * Reads .kleptowriter.json and story/story-metadata.json, compares their
 * schema versions against the current expected versions, and returns a
 * consolidated result. Missing files are noted but do not cause errors.
 *
 * @param projectDir - Absolute path to the project root directory
 * @returns StartupCheckResult with migration status
 */
export async function runStartupCheck(projectDir: string): Promise<StartupCheckResult> {
  const result: StartupCheckResult = {
    ok: true,
    currentVersion: CURRENT_VERSION,
    needsMigration: false,
    pendingMigrations: [],
    errors: [],
  };

  // ── Read manifest (.kleptowriter.json) ──────────────────────────────
  let manifestSeen = false;
  let manifestVersion = 0;
  try {
    const manifestPath = join(projectDir, ".kleptowriter.json");
    const manifestRaw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
    manifestVersion = typeof manifest.manifest_version === "number" ? manifest.manifest_version : 0;
    manifestSeen = true;
  } catch {
    // Missing or unreadable manifest — not an error, just note it
    result.errors.push("Could not read .kleptowriter.json");
  }

  // ── Read story metadata (story/story-metadata.json) ─────────────────
  let storySeen = false;
  let storySchemaVersion = 0;
  try {
    const metadataPath = join(projectDir, "story", "story-metadata.json");
    const metadataRaw = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
    storySchemaVersion = typeof metadata.schemaVersion === "number" ? metadata.schemaVersion : 0;
    storySeen = true;
  } catch {
    // Missing or unreadable story metadata — not an error, just note it
    result.errors.push("Could not read story/story-metadata.json");
  }

  // ── Compare versions ────────────────────────────────────────────────
  // Only flag migrations for files that actually exist
  if (manifestSeen && manifestVersion < MANIFEST_SCHEMA_VERSION) {
    result.needsMigration = true;
    result.pendingMigrations.push(`Manifest v${manifestVersion} → v${MANIFEST_SCHEMA_VERSION}`);
  }

  if (storySeen && storySchemaVersion < STORY_SCHEMA_VERSION) {
    result.needsMigration = true;
    result.pendingMigrations.push(`Story schema v${storySchemaVersion} → v${STORY_SCHEMA_VERSION}`);
  }

  result.ok = !result.needsMigration;
  return result;
}
