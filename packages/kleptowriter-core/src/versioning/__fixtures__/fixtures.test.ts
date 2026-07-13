import { describe, it, expect } from "bun:test";
import { loadFixture, loadFixtureJson } from "./index";

describe("fixtures", () => {
  it("loads manifest-v0.json and parses correctly", async () => {
    const content = await loadFixture("manifest-v0");
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("test-project");
    expect(parsed.created).toBe("2024-01-01T00:00:00.000Z");
    expect(parsed.kleptowriter_version).toBeUndefined();
    expect(parsed.manifest_version).toBeUndefined();
  });

  it("loads story-v0.json and has version save counter but no schemaVersion", async () => {
    const parsed = await loadFixtureJson<{ version: number; schemaVersion?: number }>("story-v0");
    expect(parsed.version).toBe(42);
    expect(parsed.schemaVersion).toBeUndefined();
    expect(parsed.characters).toBeDefined();
    expect(parsed.locations).toBeDefined();
    expect(parsed.plotThreads).toBeDefined();
  });

  it("loads story-v0-corrupt.json and throws on JSON.parse", async () => {
    const content = await loadFixture("story-v0-corrupt");
    expect(() => JSON.parse(content)).toThrow();
  });

  it("loads story-v-future.json and has schemaVersion 999", async () => {
    const parsed = await loadFixtureJson<{ schemaVersion: number }>("story-v-future");
    expect(parsed.schemaVersion).toBe(999);
  });
});
