/**
 * OS metadata filter + .kleptowriter.json helper module.
 *
 * Pure utility — no registry access, no side effects on load.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectManifest {
  version: number;
  name: string;
  created: string;
}

// ── OS metadata filter ───────────────────────────────────────────────────────

export const OS_METADATA_FILES = [
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
  "__MACOSX/",
  ".Spotlight-V100",
  ".Trashes",
  ".fseventsd",
  "ehthumbs.db",
  "$RECYCLE.BIN",
] as const;

/**
 * Returns true when `name` is an OS metadata / junk entry:
 *  - matches an entry in OS_METADATA_FILES (trailing `/` stripped for dir entries)
 *  - starts with `._`
 * Always returns false for `.` and `..`.
 */
export function isOsMetadataFile(name: string): boolean {
  // Never treat current/parent dir refs as metadata
  if (name === "." || name === "..") return false;

  // AppleDouble / resource-fork files
  if (name.startsWith("._")) return true;

  // Exact match against known entries (normalise trailing slash)
  return OS_METADATA_FILES.some((entry) => {
    const normal = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    return name === normal;
  });
}

/**
 * Returns true when the directory at `path` contains no entries other
 * than OS metadata files.
 */
export async function isEmptyDir(path: string): Promise<boolean> {
  const entries = await readdir(path);
  const real = entries.filter((e) => !isOsMetadataFile(e));
  return real.length === 0;
}

// ── Project manifest helpers ─────────────────────────────────────────────────

/**
 * Check whether `path` contains a valid .kleptowriter.json.
 * Returns false on ENOENT or JSON parse failure (never throws).
 */
export async function isValidProject(path: string): Promise<boolean> {
  const manifestPath = join(path, ".kleptowriter.json");
  try {
    const raw = await readFile(manifestPath, "utf-8");
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the `name` field from a project's .kleptowriter.json.
 * Throws if the file is missing or invalid.
 */
export async function readProjectManifest(path: string): Promise<{ name: string }> {
  const manifestPath = join(path, ".kleptowriter.json");
  const raw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(raw) as ProjectManifest;
  return { name: manifest.name };
}

/**
 * Initialise a new project at `path`:
 *  - .kleptowriter.json  — manifest
 *  - story/scenes/       — scene directory
 *  - story/story-metadata.json    — empty bible with project marker
 *  - story/.pi-session/  — session persistence
 */
export async function initProject(path: string, name: string): Promise<void> {
  const root = resolve(path);

  await mkdir(root, { recursive: true });

  // Write manifest
  const manifest: ProjectManifest = {
    version: 1,
    name,
    created: new Date().toISOString(),
  };
  await writeFile(
    join(root, ".kleptowriter.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  // Scaffold directories
  await mkdir(join(root, "story", "scenes"), { recursive: true });
  await mkdir(join(root, "story", ".pi-session"), { recursive: true });

  await writeFile(
    join(root, "story", "story-metadata.json"),
    JSON.stringify({ type: "kleptowriter-project", version: 1, characters: [], locations: [], plotThreads: [] }, null, 2),
    "utf-8",
  );
}
