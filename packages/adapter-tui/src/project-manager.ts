/**
 * Project registry — CRUD operations for Kleptowriter story projects.
 *
 * Registry stored at $HOME/.kleptowriter/projects.json.
 * Each project scaffolds: story/scenes/, story/bible.json, story/.pi-session/
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectInfo {
  name: string;
  path: string;
  created: string;
  lastOpened: string;
}

// ── Registry path ────────────────────────────────────────────────────────────

function registryPath(): string {
  const home = process.env.HOME || homedir();
  return join(home, ".kleptowriter", "projects.json");
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function readRegistry(): Promise<ProjectInfo[]> {
  const raw = await readFile(registryPath(), "utf-8").catch(() => "");
  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw) as ProjectInfo[];
  } catch {
    return [];
  }
}

async function writeRegistry(projects: ProjectInfo[]): Promise<void> {
  const dir = join(registryPath(), "..");
  await mkdir(dir, { recursive: true });
  await writeFile(registryPath(), JSON.stringify(projects, null, 2), "utf-8");
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * List all registered projects, sorted by lastOpened descending.
 */
export async function listProjects(): Promise<ProjectInfo[]> {
  const projects = await readRegistry();
  return projects.sort((a, b) => b.lastOpened.localeCompare(a.lastOpened));
}

/**
 * Create a new project: scaffold directories, bible.json, and register it.
 */
export async function createProject(name: string, path: string): Promise<ProjectInfo> {
  // Create project directory and story subdirectories
  await mkdir(join(path, "story", "scenes"), { recursive: true });
  await mkdir(join(path, "story", ".pi-session"), { recursive: true });

  // Write bible.json with empty structure
  await writeFile(
    join(path, "story", "bible.json"),
    JSON.stringify({ characters: [], locations: [], plotThreads: [] }, null, 2),
    "utf-8",
  );

  const now = new Date().toISOString();
  const project: ProjectInfo = { name, path, created: now, lastOpened: now };

  // Add to registry
  const projects = await readRegistry();
  projects.push(project);
  await writeRegistry(projects);

  return project;
}

/**
 * Resolve a project by path, or return the most recent if no path given.
 * Returns null if registry is empty.
 */
export async function resolveProject(path?: string): Promise<ProjectInfo | null> {
  const projects = await listProjects();
  if (projects.length === 0) return null;

  if (path) {
    return projects.find((p) => p.path === path) ?? null;
  }

  // Most recent (first after sort by lastOpened desc)
  return projects[0]!;
}

/**
 * Update lastOpened timestamp for the named project.
 */
export async function touchProject(name: string): Promise<void> {
  const projects = await readRegistry();
  const now = new Date().toISOString();

  for (const p of projects) {
    if (p.name === name) {
      p.lastOpened = now;
    }
  }

  await writeRegistry(projects);
}
