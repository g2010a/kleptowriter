/**
 * Project version tool — reports Kleptowriter version, manifest schema,
 * and story schema version for the current project.
 *
 * Follows the same defineTool() pattern as other tools in this registry.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { getCurrentVersion } from "@kleptowriter/kleptowriter-core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface ManifestData {
  manifest_version?: number;
  kleptowriter_version?: string;
  name?: string;
  created?: string;
}

interface StoryMetadata {
  schemaVersion?: number;
  version?: number;
}

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

/** Read and parse a JSON file, returning null on any failure. */
async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const getProjectVersionTool = defineTool({
  name: "get_project_version",
  label: "Get Project Version",
  description:
    "Shows version information for the current project, including " +
    "the Kleptowriter core version, project manifest schema version, " +
    "and story metadata schema version.",
  parameters: {},
  execute: async () => {
    const cwd = process.cwd();
    const manifest = await readJson<ManifestData>(join(cwd, ".kleptowriter.json"));
    const storyMeta = await readJson<StoryMetadata>(join(cwd, "story", "story-metadata.json"));
    const coreVersion = getCurrentVersion();

    const result = {
      kleptowriter_version: coreVersion.kleptowriterVersion,
      manifest_version: manifest?.manifest_version ?? null,
      schemaVersion: storyMeta?.schemaVersion ?? null,
      project_name: manifest?.name ?? null,
      core_manifest_schema: coreVersion.manifestSchema,
      core_story_schema: coreVersion.storySchema,
    };

    const pretty = JSON.stringify(result, null, 2);

    return {
      content: textContent(pretty),
      details: result,
    };
  },
});
