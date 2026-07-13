import { describe, it, expect } from "bun:test";
import { VersionRegistry, type Migration } from "./registry.js";

describe("VersionRegistry", () => {
  it("empty registry returns 0 for getMaxSchemaVersion", () => {
    const registry = new VersionRegistry();
    expect(registry.getMaxSchemaVersion()).toBe(0);
  });

  it("single migration: register one, getUpgradePath(0, 1) returns it", () => {
    const registry = new VersionRegistry();
    const migration: Migration = {
      from: 0,
      to: 1,
      migrate: (data) => data,
      description: "v0 to v1",
    };
    registry.register(migration);

    const path = registry.getUpgradePath(0, 1);
    expect(path).toHaveLength(1);
    expect(path[0]).toBe(migration);
  });

  it("chained migrations: register v0→1 and v1→2, getUpgradePath(0, 2) returns both in order", () => {
    const registry = new VersionRegistry();
    const m1: Migration = {
      from: 0,
      to: 1,
      migrate: (data) => data,
      description: "v0 to v1",
    };
    const m2: Migration = {
      from: 1,
      to: 2,
      migrate: (data) => data,
      description: "v1 to v2",
    };
    registry.register(m1);
    registry.register(m2);

    const path = registry.getUpgradePath(0, 2);
    expect(path).toHaveLength(2);
    expect(path[0]).toBe(m1);
    expect(path[1]).toBe(m2);
  });

  it("out-of-range: canHandle returns false for version > max", () => {
    const registry = new VersionRegistry();
    const migration: Migration = {
      from: 0,
      to: 1,
      migrate: (data) => data,
      description: "v0 to v1",
    };
    registry.register(migration);

    expect(registry.canHandle(1)).toBe(true);
    expect(registry.canHandle(2)).toBe(false);
    expect(registry.canHandle(100)).toBe(false);
  });

  it("max version query: getMaxSchemaVersion returns highest 'to'", () => {
    const registry = new VersionRegistry();
    const m1: Migration = {
      from: 0,
      to: 1,
      migrate: (data) => data,
      description: "v0 to v1",
    };
    const m2: Migration = {
      from: 1,
      to: 3,
      migrate: (data) => data,
      description: "v1 to v3",
    };
    const m3: Migration = {
      from: 3,
      to: 2,
      migrate: (data) => data,
      description: "v3 to v2",
    };
    registry.register(m1);
    registry.register(m2);
    registry.register(m3);

    expect(registry.getMaxSchemaVersion()).toBe(3);
  });
});