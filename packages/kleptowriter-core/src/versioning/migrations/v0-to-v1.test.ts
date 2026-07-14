import { describe, it, expect } from "bun:test";
import { manifestV0toV1, storySchemaV0toV1 } from "./v0-to-v1.js";
import { setupMigrations } from "./registry-setup.js";
import { VersionRegistry } from "../registry.js";
import { CURRENT_VERSION } from "../version.js";

import manifestV0 from "../__fixtures__/manifest-v0.json" with { type: "json" };
import storyV0 from "../__fixtures__/story-v0.json" with { type: "json" };
import storyVFuture from "../__fixtures__/story-v-future.json" with { type: "json" };

describe("manifestV0toV1", () => {
  it("adds version fields to old-format manifest", () => {
    const result = manifestV0toV1(manifestV0) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.kleptowriter_version).toBe(CURRENT_VERSION);
    expect(result.manifest_version).toBe(1);
  });

  it("preserves existing fields from old manifest", () => {
    const result = manifestV0toV1(manifestV0) as Record<string, unknown>;

    expect(result.name).toBe("test-project");
    expect(result.created).toBe("2024-01-01T00:00:00.000Z");
  });

  it("preserves extra fields not in the schema", () => {
    const input = { name: "test", created: "now", extraField: "survive" };
    const result = manifestV0toV1(input) as Record<string, unknown>;

    expect(result.extraField).toBe("survive");
  });

  it("does not mutate the original input", () => {
    const input = { name: "test", created: "now" };
    const inputClone = { ...input };
    manifestV0toV1(input);

    expect(input).toEqual(inputClone);
  });

  it("is idempotent for already-new manifest", () => {
    const input = { name: "test", created: "now", manifest_version: 1, kleptowriter_version: CURRENT_VERSION };
    const result = manifestV0toV1(input) as Record<string, unknown>;

    expect(result.manifest_version).toBe(1);
    expect(result.kleptowriter_version).toBe(CURRENT_VERSION);
    // no duplicate or changed values
    expect(Object.keys(result).sort()).toEqual(Object.keys(input).sort());
  });

  it("handles null input gracefully", () => {
    expect(manifestV0toV1(null)).toBeNull();
  });

  it("handles undefined input gracefully", () => {
    expect(manifestV0toV1(undefined)).toBeUndefined();
  });

  it("passes non-object types through unchanged", () => {
    expect(manifestV0toV1("string")).toBe("string");
    expect(manifestV0toV1(42)).toBe(42);
    expect(manifestV0toV1(true)).toBe(true);
  });
});

describe("storySchemaV0toV1", () => {
  it("adds schemaVersion to old-format story metadata", () => {
    const result = storySchemaV0toV1(storyV0) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result.schemaVersion).toBe(1);
  });

  it("preserves existing fields including version save counter", () => {
    const result = storySchemaV0toV1(storyV0) as Record<string, unknown>;

    // version is the save counter, must be preserved
    expect(result.version).toBe(42);
    // structural fields
    expect(Array.isArray(result.characters)).toBe(true);
    expect(Array.isArray(result.locations)).toBe(true);
    expect(Array.isArray(result.plotThreads)).toBe(true);
  });

  it("does not mutate the original input", () => {
    const input = { version: 1, characters: [] };
    const inputClone = { ...input };
    storySchemaV0toV1(input);

    expect(input).toEqual(inputClone);
  });

  it("is idempotent when schemaVersion already exists", () => {
    // story-v-future.json already has schemaVersion: 999
    const result = storySchemaV0toV1(storyVFuture) as Record<string, unknown>;

    expect(result.schemaVersion).toBe(999);
    // version save counter unchanged
    expect(result.version).toBe(1);
  });

  it("handles null input gracefully", () => {
    expect(storySchemaV0toV1(null)).toBeNull();
  });

  it("handles undefined input gracefully", () => {
    expect(storySchemaV0toV1(undefined)).toBeUndefined();
  });

  it("passes non-object types through unchanged", () => {
    expect(storySchemaV0toV1("string")).toBe("string");
    expect(storySchemaV0toV1(42)).toBe(42);
    expect(storySchemaV0toV1(true)).toBe(true);
  });
});

describe("registry-setup", () => {
  it("setupMigrations registers both manifest and story migrations", () => {
    const registry = new VersionRegistry();
    setupMigrations(registry);

    const path = registry.getUpgradePath(0, 1);
    expect(path).toHaveLength(2);

    const descriptions = path.map((m) => m.description);
    expect(descriptions.some((d) => d.includes("Manifest"))).toBe(true);
    expect(descriptions.some((d) => d.includes("Story"))).toBe(true);
  });

  it("registered manifest migration produces correct output", () => {
    const registry = new VersionRegistry();
    setupMigrations(registry);

    const path = registry.getUpgradePath(0, 1);
    const manifestMigration = path.find((m) => m.description.includes("Manifest"))!;
    const result = manifestMigration.migrate(manifestV0) as Record<string, unknown>;

    expect(result.kleptowriter_version).toBe(CURRENT_VERSION);
    expect(result.manifest_version).toBe(1);
  });

  it("registered story migration produces correct output", () => {
    const registry = new VersionRegistry();
    setupMigrations(registry);

    const path = registry.getUpgradePath(0, 1);
    const storyMigration = path.find((m) => m.description.includes("Story"))!;
    const result = storyMigration.migrate(storyV0) as Record<string, unknown>;

    expect(result.schemaVersion).toBe(1);
  });
});
