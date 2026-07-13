import { expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectVersionTool } from "./project-version-tools.js";
import { getCurrentVersion } from "@kleptowriter/kleptowriter-core";

const TMP = join(import.meta.dir, "../tmp-project-version");
const ORIGINAL_CWD = process.cwd();

function setup() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  process.chdir(TMP);
}

function teardown() {
  process.chdir(ORIGINAL_CWD);
  rmSync(TMP, { recursive: true, force: true });
}

test("get_project_version returns core version when no project files exist", async () => {
  setup();
  try {
    const r = await getProjectVersionTool.execute("t1", {} as any, undefined, undefined, {} as any);
    const d = r.details as Record<string, unknown>;

    expect(d.kleptowriter_version).toBe(getCurrentVersion().kleptowriterVersion);
    expect(d.manifest_version).toBeNull();
    expect(d.schemaVersion).toBeNull();
    expect(d.project_name).toBeNull();
  } finally {
    teardown();
  }
});

test("get_project_version reads manifest and story metadata", async () => {
  setup();
  try {
    writeFileSync(
      join(TMP, ".kleptowriter.json"),
      JSON.stringify({
        name: "my-novel",
        created: "2024-06-01T00:00:00.000Z",
        manifest_version: 1,
        kleptowriter_version: "0.3.0",
      }),
      "utf-8",
    );

    const storyDir = join(TMP, "story");
    mkdirSync(storyDir, { recursive: true });
    writeFileSync(
      join(storyDir, "story-metadata.json"),
      JSON.stringify({
        schemaVersion: 1,
        version: 1,
        characters: [],
        locations: [],
        plotThreads: [],
      }),
      "utf-8",
    );

    const r = await getProjectVersionTool.execute("t2", {} as any, undefined, undefined, {} as any);
    const d = r.details as Record<string, unknown>;

    expect(d.kleptowriter_version).toBe(getCurrentVersion().kleptowriterVersion);
    expect(d.manifest_version).toBe(1);
    expect(d.schemaVersion).toBe(1);
    expect(d.project_name).toBe("my-novel");
  } finally {
    teardown();
  }
});

test("get_project_version handles missing story-metadata.json gracefully", async () => {
  setup();
  try {
    writeFileSync(
      join(TMP, ".kleptowriter.json"),
      JSON.stringify({
        name: "bare-project",
        created: "2024-01-01T00:00:00.000Z",
        manifest_version: 1,
      }),
      "utf-8",
    );

    const r = await getProjectVersionTool.execute("t3", {} as any, undefined, undefined, {} as any);
    const d = r.details as Record<string, unknown>;

    expect(d.kleptowriter_version).toBe(getCurrentVersion().kleptowriterVersion);
    expect(d.manifest_version).toBe(1);
    expect(d.schemaVersion).toBeNull();
    expect(d.project_name).toBe("bare-project");
  } finally {
    teardown();
  }
});

test("get_project_version returns content with JSON string", async () => {
  setup();
  try {
    writeFileSync(
      join(TMP, ".kleptowriter.json"),
      JSON.stringify({ name: "test", manifest_version: 1 }),
      "utf-8",
    );
    const r = await getProjectVersionTool.execute("t4", {} as any, undefined, undefined, {} as any);

    expect(r.content).toBeDefined();
    expect(Array.isArray(r.content)).toBe(true);
    expect(r.content.length).toBeGreaterThanOrEqual(1);
    const textBlock = r.content[0] as { type: string; text: string };
    expect(textBlock.type).toBe("text");
    const parsed = JSON.parse(textBlock.text);
    expect(parsed.kleptowriter_version).toBeDefined();
  } finally {
    teardown();
  }
});
