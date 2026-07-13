/**
 * Shared project manifest creation for Kleptowriter adapters.
 *
 * Pure utility — no side effects on import.
 */

import { writeFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { CURRENT_VERSION, MANIFEST_SCHEMA_VERSION } from "./version.js";

export interface ProjectManifest {
  manifest_version: number;
  kleptowriter_version: string;
  name: string;
  created: string;
}

/**
 * Create a .kleptowriter.json manifest at the given path.
 * Derives project name from the directory name if not provided.
 *
 * @param path - Absolute or relative path to the project root directory
 * @param name - Optional project name (defaults to directory name)
 * @throws If the manifest file already exists or write fails
 */
export async function createManifest(
  path: string,
  name?: string,
): Promise<void> {
  const root = resolve(path);
  const manifestPath = join(root, ".kleptowriter.json");

  const projectName = name ?? basename(root);

  const manifest: ProjectManifest = {
    manifest_version: MANIFEST_SCHEMA_VERSION,
    kleptowriter_version: CURRENT_VERSION,
    name: projectName,
    created: new Date().toISOString(),
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}