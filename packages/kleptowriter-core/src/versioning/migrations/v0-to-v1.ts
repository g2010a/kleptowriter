/**
 * Migration: v0 → v1 for manifest and story schema.
 *
 * Pure data transforms — no file I/O, no mutation.
 */

import { CURRENT_VERSION, MANIFEST_SCHEMA_VERSION, STORY_SCHEMA_VERSION } from "../version.js";

/**
 * Migrate a v0 manifest (no version fields) to v1.
 *
 * Input:  `{ name, created, ... }` — no `kleptowriter_version` or `manifest_version`
 * Output: adds `kleptowriter_version: "0.3.0"` and `manifest_version: 1`
 *
 * Returns a new object. Null/undefined inputs pass through unchanged.
 */
export function manifestV0toV1(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const old = data as Record<string, unknown>;

  // ponytail: spread ensures no mutation and preserves extras
  // Only add version fields if missing — already-migrated data passes through unchanged
  return {
    ...old,
    ...("manifest_version" in old ? {} : { manifest_version: MANIFEST_SCHEMA_VERSION }),
    ...("kleptowriter_version" in old ? {} : { kleptowriter_version: CURRENT_VERSION }),
  };
}

/**
 * Migrate a v0 story schema (no schemaVersion) to v1.
 *
 * Input:  `{ version: 42, characters, ... }` — `version` is a save counter, no `schemaVersion`
 * Output: adds `schemaVersion: 1`
 *
 * Returns a new object. Null/undefined inputs pass through unchanged.
 */
export function storySchemaV0toV1(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const old = data as Record<string, unknown>;

  // Only add schemaVersion if missing — already-migrated data passes through unchanged
  return {
    ...old,
    ...("schemaVersion" in old ? {} : { schemaVersion: STORY_SCHEMA_VERSION }),
  };
}
