#!/usr/bin/env bun
/**
 * Version check CLI for Kleptowriter.
 * Reads project manifest and story metadata to report version status.
 */

import { CURRENT_VERSION, MANIFEST_SCHEMA_VERSION, STORY_SCHEMA_VERSION } from "./version.js";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface ManifestData {
  name?: string;
  created?: string;
  kleptowriter_version?: string;
  manifest_version?: number;
}

interface StoryMetadata {
  version?: number;
  schemaVersion?: number;
}

function parseArgs(): { projectDir: string } {
  const args = process.argv.slice(2);
  let projectDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-dir" && i + 1 < args.length) {
      const dir = args[i + 1];
      if (dir) {
        projectDir = resolve(dir);
      }
      i++;
    }
  }

  return { projectDir };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { projectDir } = parseArgs();

  const manifestPath = join(projectDir, ".kleptowriter.json");
  const storyPath = join(projectDir, "story", "story-metadata.json");

  const manifest = await readJsonFile<ManifestData>(manifestPath);
  const story = await readJsonFile<StoryMetadata>(storyPath);

  const manifestVersion = manifest?.manifest_version ?? manifest?.kleptowriter_version ?? "N/A";
  const storyVersion = story?.schemaVersion ?? "N/A";
  const storySchemaVersion = story?.schemaVersion ?? "N/A";

  const manifestCurrent = manifest?.manifest_version === MANIFEST_SCHEMA_VERSION ||
    manifest?.kleptowriter_version === CURRENT_VERSION;
  const storyCurrent = story?.schemaVersion === STORY_SCHEMA_VERSION;

  const allCurrent = manifestCurrent && storyCurrent;

  console.log(
    `kleptowriter v${CURRENT_VERSION} (manifest schema: ${manifestVersion}, story schema: ${storySchemaVersion})`
  );

  process.exit(allCurrent ? 0 : 1);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});