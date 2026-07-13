/**
 * Migration orchestration: load a JSON file, detect schema version, and
 * apply pending migrations with backup/rollback safety.
 */

import { readFile, copyFile, unlink } from "node:fs/promises";
import { VersionRegistry } from "./registry.js";

/**
 * Thrown when the data on disk has a schema version higher than the
 * code supports — indicates a downgrade (e.g. running old code on new data).
 */
export class VersionDowngradeError extends Error {
  constructor(dataVersion: number, maxVersion: number) {
    super(
      `Data schema version ${dataVersion} exceeds max supported version ${maxVersion}. ` +
        "This appears to be a downgrade — run a newer version of the tool.",
    );
    this.name = "VersionDowngradeError";
  }
}

/**
 * Thrown when an individual migration step fails.
 * On failure the original file is restored from backup before the error is thrown.
 */
export class MigrationFailedError extends Error {
  constructor(
    message: string,
    public readonly from: number,
    public readonly to: number,
  ) {
    super(message);
    this.name = "MigrationFailedError";
  }
}

/**
 * Read the schema version from a parsed data object.
 *
 * Checks `schemaVersion` first (story files), then `manifest_version`
 * (manifest files), then returns 0 if neither field exists.
 * Non-object or nullish input returns 0.
 */
export function getSchemaVersion(data: unknown): number {
  if (data === null || data === undefined) return 0;
  if (typeof data !== "object" || Array.isArray(data)) return 0;

  const obj = data as Record<string, unknown>;

  if (typeof obj.schemaVersion === "number") return obj.schemaVersion;
  if (typeof obj.manifest_version === "number") return obj.manifest_version;

  return 0;
}

/**
 * Load a JSON file from disk, detect its schema version, and apply all
 * pending migrations through the given registry.
 *
 * Each migration step is wrapped with a backup file at `${filePath}.bak`:
 * - Backup is created before the migration runs
 * - Deleted on success
 * - Restored on failure (then deleted), and a `MigrationFailedError` is thrown
 *
 * @returns The migrated data and a flag indicating whether any migration ran.
 */
export async function loadAndMigrate<T>(
  filePath: string,
  registry: VersionRegistry,
  maxVersion: number,
): Promise<{ data: T; migrated: boolean }> {
  const raw = await readFile(filePath, "utf-8");
  let data: unknown = JSON.parse(raw);

  const currentVersion = getSchemaVersion(data);

  if (currentVersion > maxVersion) {
    throw new VersionDowngradeError(currentVersion, maxVersion);
  }

  const upgradePath = registry.getUpgradePath(currentVersion, maxVersion);

  if (upgradePath.length === 0) {
    return { data: data as T, migrated: false };
  }

  for (const migration of upgradePath) {
    const backupPath = `${filePath}.bak`;

    // Create backup before migration
    await copyFile(filePath, backupPath);

    try {
      data = migration.migrate(data);
    } catch (cause) {
      // Migration failed — restore the original file from backup
      try {
        await copyFile(backupPath, filePath);
      } catch {
        // best-effort: if restore fails there's little we can do
      }
      await unlink(backupPath).catch(() => {});
      throw new MigrationFailedError(
        `Migration v${migration.from} → v${migration.to} failed: ${(cause as Error).message}`,
        migration.from,
        migration.to,
      );
    }

    // Migration succeeded — remove backup
    await unlink(backupPath);
  }

  return { data: data as T, migrated: true };
}
