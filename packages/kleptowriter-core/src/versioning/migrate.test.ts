import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VersionRegistry, type Migration } from "./registry.js";
import {
  getSchemaVersion,
  loadAndMigrate,
  VersionDowngradeError,
  MigrationFailedError,
} from "./migrate.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return true if a file exists at the given path. */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** A simple migration that adds a `counter` field. */
const addCounterMigration: Migration = {
  from: 0,
  to: 1,
  migrate: (data: unknown) => {
    const obj = (data ?? {}) as Record<string, unknown>;
    return { ...obj, counter: (obj.counter as number ?? 0) + 1 };
  },
  description: "v0 → v1: add counter",
};

/** A migration that always throws. */
const failingMigration: Migration = {
  from: 0,
  to: 1,
  migrate: () => {
    throw new Error("simulated migration failure");
  },
  description: "v0 → v1: always fails",
};

// ---------------------------------------------------------------------------
// getSchemaVersion
// ---------------------------------------------------------------------------

describe("getSchemaVersion", () => {
  it("reads schemaVersion from story data", () => {
    expect(getSchemaVersion({ schemaVersion: 3 })).toBe(3);
  });

  it("reads manifest_version from manifest data", () => {
    expect(getSchemaVersion({ manifest_version: 1 })).toBe(1);
  });

  it("prefers schemaVersion over manifest_version", () => {
    expect(
      getSchemaVersion({ schemaVersion: 2, manifest_version: 1 }),
    ).toBe(2);
  });

  it("returns 0 when no version field is present", () => {
    expect(getSchemaVersion({ name: "test", value: 42 })).toBe(0);
  });

  it("returns 0 for empty object", () => {
    expect(getSchemaVersion({})).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(getSchemaVersion(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(getSchemaVersion(undefined)).toBe(0);
  });

  it("returns 0 for arrays", () => {
    expect(getSchemaVersion([1, 2, 3])).toBe(0);
  });

  it("returns 0 for strings", () => {
    expect(getSchemaVersion("hello")).toBe(0);
  });

  it("returns 0 for numbers", () => {
    expect(getSchemaVersion(42)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// loadAndMigrate
// ---------------------------------------------------------------------------

describe("loadAndMigrate", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "migrate-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function fixturePath(name: string): string {
    return join(tmpDir, name);
  }

  // ----- fresh data (no migration needed) -------------------------------

  it("returns migrated=false when data is already at maxVersion", async () => {
    const fp = fixturePath("fresh.json");
    await writeFile(fp, JSON.stringify({ schemaVersion: 1, name: "test" }));

    const registry = new VersionRegistry();
    registry.register(addCounterMigration);

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      1,
    );

    expect(result.migrated).toBe(false);
    expect(result.data.name).toBe("test");
    // counter should NOT have been added
    expect(result.data.counter).toBeUndefined();
  });

  it("returns migrated=false when data has no schema fields and maxVersion is 0", async () => {
    const fp = fixturePath("fresh-unschemed.json");
    await writeFile(fp, JSON.stringify({ name: "test" }));

    const registry = new VersionRegistry();

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      0,
    );

    expect(result.migrated).toBe(false);
    expect(result.data.name).toBe("test");
  });

  it("returns migrated=false when data has manifest_version at maxVersion", async () => {
    const fp = fixturePath("manifest-fresh.json");
    await writeFile(
      fp,
      JSON.stringify({ manifest_version: 1, name: "test" }),
    );

    const registry = new VersionRegistry();
    registry.register(addCounterMigration);

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      1,
    );

    expect(result.migrated).toBe(false);
  });

  // ----- old data (migration needed) ------------------------------------

  it("applies v0→v1 migration and returns migrated=true", async () => {
    const fp = fixturePath("old.json");
    await writeFile(fp, JSON.stringify({ name: "legacy" }));

    const registry = new VersionRegistry();
    registry.register(addCounterMigration);

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      1,
    );

    expect(result.migrated).toBe(true);
    expect(result.data.name).toBe("legacy");
    expect(result.data.counter).toBe(1);
  });

  it("applies multiple chained migrations", async () => {
    const fp = fixturePath("chained.json");
    await writeFile(fp, JSON.stringify({ name: "legacy" }));

    const registry = new VersionRegistry();
    registry.register(addCounterMigration); // v0→1

    const v1toV2: Migration = {
      from: 1,
      to: 2,
      migrate: (data: unknown) => {
        const obj = (data ?? {}) as Record<string, unknown>;
        return { ...obj, doubled: true };
      },
      description: "v1 → v2: add doubled flag",
    };
    registry.register(v1toV2);

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      2,
    );

    expect(result.migrated).toBe(true);
    expect(result.data.counter).toBe(1);
    expect(result.data.doubled).toBe(true);
  });

  // ----- downgrade detection --------------------------------------------

  it("throws VersionDowngradeError when data version exceeds maxVersion", async () => {
    const fp = fixturePath("future.json");
    await writeFile(
      fp,
      JSON.stringify({ schemaVersion: 42, name: "from-future" }),
    );

    const registry = new VersionRegistry();

    expect(
      loadAndMigrate(fp, registry, 1),
    ).rejects.toThrow(VersionDowngradeError);
  });

  it("downgrade error message includes the version numbers", async () => {
    const fp = fixturePath("future-msg.json");
    await writeFile(
      fp,
      JSON.stringify({ schemaVersion: 99, name: "test" }),
    );

    const registry = new VersionRegistry();

    try {
      await loadAndMigrate(fp, registry, 5);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(VersionDowngradeError);
      expect((error as VersionDowngradeError).message).toContain("99");
      expect((error as VersionDowngradeError).message).toContain("5");
    }
  });

  // ----- backup / restore on failure ------------------------------------

  it("restores original file when a migration fails", async () => {
    const fp = fixturePath("will-fail.json");
    const original = { name: "original", value: 123 };
    await writeFile(fp, JSON.stringify(original));

    const registry = new VersionRegistry();
    registry.register(failingMigration);

    // Run the migration — expect it to throw
    await expect(
      loadAndMigrate(fp, registry, 1),
    ).rejects.toThrow(MigrationFailedError);

    // Original file should be restored from backup
    const restoredRaw = await readFile(fp, "utf-8");
    const restored = JSON.parse(restoredRaw) as Record<string, unknown>;
    expect(restored.name).toBe("original");
    expect(restored.value).toBe(123);
  });

  it("does NOT leave a .bak file after failed migration", async () => {
    const fp = fixturePath("no-bak-after-fail.json");
    await writeFile(fp, JSON.stringify({ name: "test" }));

    const registry = new VersionRegistry();
    registry.register(failingMigration);

    await expect(
      loadAndMigrate(fp, registry, 1),
    ).rejects.toThrow(MigrationFailedError);

    expect(await fileExists(`${fp}.bak`)).toBe(false);
  });

  it("MigrationFailedError includes from/to version info", async () => {
    const fp = fixturePath("fail-versions.json");
    await writeFile(fp, JSON.stringify({ name: "test" }));

    const registry = new VersionRegistry();
    registry.register(failingMigration);

    try {
      await loadAndMigrate(fp, registry, 1);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MigrationFailedError);
      const mfe = error as MigrationFailedError;
      expect(mfe.from).toBe(0);
      expect(mfe.to).toBe(1);
    }
  });

  // ----- backup deleted on success --------------------------------------

  it("deletes .bak file after successful migration", async () => {
    const fp = fixturePath("success-cleanup.json");
    await writeFile(fp, JSON.stringify({ name: "old" }));

    const registry = new VersionRegistry();
    registry.register(addCounterMigration);

    await loadAndMigrate(fp, registry, 1);

    expect(await fileExists(`${fp}.bak`)).toBe(false);
  });

  // ----- schema reads manifest_version in migration ---------------------

  it("migrates data using manifest_version field detection", async () => {
    const fp = fixturePath("manifest-old.json");
    // No manifest_version => detected as v0
    await writeFile(fp, JSON.stringify({ name: "old-manifest" }));

    const registry = new VersionRegistry();
    registry.register(addCounterMigration);

    const result = await loadAndMigrate<Record<string, unknown>>(
      fp,
      registry,
      1,
    );

    expect(result.migrated).toBe(true);
    expect(result.data.name).toBe("old-manifest");
    expect(result.data.counter).toBe(1);
  });
});
