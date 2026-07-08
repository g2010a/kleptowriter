import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  listProjects,
  createProject,
  resolveProject,
  touchProject,
} from "./project-manager.js";

// ── Test isolation via HOME override ──────────────────────────────────────────

let originalHome: string | undefined;
let tmpHome: string;

beforeEach(async () => {
  originalHome = process.env.HOME;
  tmpHome = await mkdtemp(join(tmpdir(), "proj-mgr-test-"));
  process.env.HOME = tmpHome;
});

afterEach(async () => {
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  } else {
    delete process.env.HOME;
  }
  await rm(tmpHome, { recursive: true, force: true });
});

// ── Tests ────────────────────────────────────────────────────────────────────

test("listProjects on fresh install returns empty array", async () => {
  const projects = await listProjects();
  expect(projects).toEqual([]);
});

test("createProject creates directory structure and bible.json", async () => {
  const projectDir = join(tmpHome, "test-project");
  const project = await createProject("My Mystery", projectDir);

  expect(project.name).toBe("My Mystery");
  expect(project.path).toBe(projectDir);
  expect(project.created).toBeTruthy();
  expect(project.lastOpened).toBeTruthy();

  // Verify directory structure
  const scenesStat = await stat(join(projectDir, "story", "scenes"));
  expect(scenesStat.isDirectory()).toBe(true);

  const piStat = await stat(join(projectDir, "story", ".pi-session"));
  expect(piStat.isDirectory()).toBe(true);

  // Verify bible.json
  const bibleRaw = await readFile(join(projectDir, "story", "bible.json"), "utf-8");
  const bible = JSON.parse(bibleRaw);
  expect(bible.characters).toEqual([]);
  expect(bible.locations).toEqual([]);
  expect(bible.plotThreads).toEqual([]);
});

test("listProjects returns 1 entry after creation", async () => {
  const projectDir = join(tmpHome, "proj-a");
  await createProject("Project A", projectDir);

  const projects = await listProjects();
  expect(projects.length).toBe(1);
  expect(projects[0]!.name).toBe("Project A");
});

test("resolveProject returns most recent when no path given", async () => {
  const dirA = join(tmpHome, "proj-a");
  const dirB = join(tmpHome, "proj-b");
  await createProject("Old", dirA);

  // Small delay so timestamps differ
  await Bun.sleep(10);

  await createProject("New", dirB);

  const resolved = await resolveProject();
  expect(resolved).not.toBeNull();
  expect(resolved!.name).toBe("New");
});

test("resolveProject returns null for empty registry", async () => {
  const resolved = await resolveProject();
  expect(resolved).toBeNull();
});

test("resolveProject finds project by path", async () => {
  const dir = join(tmpHome, "specific");
  const created = await createProject("Specific", dir);

  const found = await resolveProject(dir);
  expect(found).not.toBeNull();
  expect(found!.name).toBe("Specific");
});

test("touchProject updates lastOpened timestamp", async () => {
  const dir = join(tmpHome, "touch-me");
  const original = await createProject("Touchable", dir);
  const originalOpened = original.lastOpened;

  await Bun.sleep(10);
  await touchProject("Touchable");

  const projects = await listProjects();
  const touched = projects.find((p) => p.name === "Touchable")!;
  expect(touched.lastOpened).not.toBe(originalOpened);
  expect(new Date(touched.lastOpened).getTime()).toBeGreaterThan(
    new Date(originalOpened).getTime(),
  );
});

test("listProjects sorts by lastOpened descending", async () => {
  const dirA = join(tmpHome, "first");
  const dirB = join(tmpHome, "second");
  await createProject("First", dirA);
  await Bun.sleep(10);
  await createProject("Second", dirB);
  await Bun.sleep(10);
  await touchProject("First"); // makes First most recent

  const projects = await listProjects();
  expect(projects[0]!.name).toBe("First");
  expect(projects[1]!.name).toBe("Second");
});
