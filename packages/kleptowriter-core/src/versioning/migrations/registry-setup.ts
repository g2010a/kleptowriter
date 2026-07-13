/**
 * Migration registry setup.
 *
 * Registers all known v0→v1 migrations with the VersionRegistry.
 */

import { VersionRegistry, type Migration } from "../registry.js";
import { manifestV0toV1, storySchemaV0toV1 } from "./v0-to-v1.js";

/**
 * Register all v0→v1 migrations into the given registry.
 */
export function setupMigrations(registry: VersionRegistry): void {
  const manifestMigration: Migration = {
    from: 0,
    to: 1,
    migrate: manifestV0toV1,
    description: "Manifest v0 → v1: adds manifest_version and kleptowriter_version",
  };

  const storyMigration: Migration = {
    from: 0,
    to: 1,
    migrate: storySchemaV0toV1,
    description: "Story schema v0 → v1: adds schemaVersion",
  };

  registry.register(manifestMigration);
  registry.register(storyMigration);
}
