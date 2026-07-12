/**
 * Scene tools for the Pi SDK Kleptowriter harness.
 *
 * Implements write_scene, read_scene, and list_scenes with real file I/O.
 * Uses core serializeScene/parseScene/readScene for frontmatter handling.
 *
 * Scene ID convention: `{beat-slug}-{sequence:02d}-{slug}` (e.g. setup-01-opening).
 * Chapters/acts are NOT encoded in IDs — those are deduced retroactively.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { readScene, serializeScene, parseScene, SceneStatus } from "@kleptowriter/kleptowriter-core";
import type { SceneDocument } from "@kleptowriter/kleptowriter-core";
import { SceneDatastore } from "@kleptowriter/kleptowriter-core/eval/datastore.js";
import { writeFile, readFile, readdir, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadBible } from "../bible/persistence.js";
import type { StylometryProfile } from "./types.js";
import {
  WriteSceneParamsSchema,
  ReadSceneParamsSchema,
  ListScenesParamsSchema,
} from "./types.js";
import type {
  WriteSceneParams,
  ReadSceneParams,
  ListScenesParams,
  WriteSceneResult,
  ReadSceneResult,
  ListScenesResult,
  ListScenesResultItem,
} from "./types.js";

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SCENES_DIR = "./story/scenes";

// {beat-slug}-{sequence:02d}-{slug} — e.g. setup-01-opening, rising-action-03-first-attempt
const SCENE_ID_RE = /^[a-z]+(-[a-z]+)*-\d{2}-[a-z]+(-[a-z]+)*$/;

// ponytail: module-level singleton; add per-session instances when concurrent sessions needed
const sceneStore = new SceneDatastore();

export function getSceneStore(): SceneDatastore {
  return sceneStore;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function validateSceneId(sceneId: string): string | null {
  if (!SCENE_ID_RE.test(sceneId)) {
    return (
      `Invalid scene ID "${sceneId}". ` +
      `Expected format: {beat-slug}-{sequence:02d}-{slug} (e.g. setup-01-opening)`
    );
  }
  return null;
}

function sceneFilePath(sceneId: string, dir = DEFAULT_SCENES_DIR): string {
  return join(dir, `${sceneId}.md`);
}

// ponytail: temp→rename atomicity is same-filesystem only; cross-device would need copy+delete
async function atomicWrite(targetPath: string, content: string): Promise<void> {
  const dir = join(targetPath, "..");
  await mkdir(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}`;
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, targetPath);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ponytail: `object` not `Record<string,unknown>` — TS interfaces lack index signatures
function okResult(result: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    details: result,
  };
}

// ── Stylometry check ────────────────────────────────────────────────────────

const STYLOMETRY_FIELDS: (keyof StylometryProfile)[] = [
  "narrativeVoice",
  "povStyle",
  "tensePreference",
  "vocabularyRegister",
  "sentenceLengthTarget",
  "proseStyleNotes",
  "dialogueStyleNotes",
  "pacingPreference",
  "paragraphStructure",
  "rhetoricalDevices",
  "commaStyle",
  "dialogueTagPreference",
];

function isStylometryEmpty(stylometry: StylometryProfile | undefined): boolean {
  if (!stylometry) return true;
  return STYLOMETRY_FIELDS.every((field) => !stylometry[field]);
}

// ── write_scene ─────────────────────────────────────────────────────────────

export const writeSceneTool = defineTool({
  name: "write_scene",
  label: "Write Scene",
  description:
    "Creates or updates a narrative scene. Provide a scene ID, title, " +
    "prose body, and a metadata object describing POV, characters, " +
    "locations, chronology, tension, mood, plot threads, and thematic " +
    "motifs. Returns the file path and success status.",
  parameters: WriteSceneParamsSchema,
  execute: async (_toolCallId, params: WriteSceneParams) => {
    const validationError = validateSceneId(params.sceneId);
    if (validationError) {
      const result: WriteSceneResult = { ok: false, path: "", error: validationError };
      return okResult(result);
    }

    // Check stylometry profile in bible
    const bible = await loadBible("./story/story-metadata.json");
    if (isStylometryEmpty(bible.stylometry)) {
      const result: WriteSceneResult = {
        ok: false,
        path: "",
        error:
          "Stylometry profile is empty. The story bible requires a stylometry section before writing scenes. " +
          "Please provide writing style preferences for: " +
          "narrativeVoice, povStyle, tensePreference, vocabularyRegister, sentenceLengthTarget, " +
          "proseStyleNotes, dialogueStyleNotes, pacingPreference, paragraphStructure, rhetoricalDevices, " +
          "commaStyle, dialogueTagPreference",
      };
      return okResult(result);
    }

    const path = sceneFilePath(params.sceneId);

    // Preserve status on update; default to Outline for new scenes
    let status = SceneStatus.Outline;
    let customFields: Record<string, unknown> = {};
    const existing = await readScene(path);
    if (existing.ok) {
      status = existing.data.status;
      customFields = existing.data.customFields;
    }

    const doc: SceneDocument = {
      id: params.sceneId,
      title: params.title,
      status,
      metadata: {
        pov: params.metadata.pov,
        characters: params.metadata.characters,
        locations: params.metadata.locations,
        chronology: params.metadata.chronology,
        tension: params.metadata.tension,
        mood: params.metadata.mood,
        plotThreads: params.metadata.plotThreads,
        thematicMotifs: params.metadata.thematicMotifs,
        dramaticQuestions: [],
      },
      prose: params.prose,
      customFields,
    };

    await atomicWrite(path, serializeScene(doc));
    sceneStore.store(doc);

    const result: WriteSceneResult = { ok: true, path };
    return okResult(result);
  },
});

// ── read_scene ──────────────────────────────────────────────────────────────

export const readSceneTool = defineTool({
  name: "read_scene",
  label: "Read Scene",
  description:
    "Reads a scene by its identifier. Returns the full scene document " +
    "on success, or an error message when the scene does not exist.",
  parameters: ReadSceneParamsSchema,
  execute: async (_toolCallId, params: ReadSceneParams) => {
    const validationError = validateSceneId(params.sceneId);
    if (validationError) {
      const result: ReadSceneResult = { ok: false, error: validationError };
      return okResult(result);
    }

    const path = sceneFilePath(params.sceneId);
    const coreResult = await readScene(path);

    if (!coreResult.ok) {
      const result: ReadSceneResult = { ok: false, error: coreResult.error };
      return okResult(result);
    }

    const result: ReadSceneResult = { ok: true, scene: coreResult.data };
    return okResult(result);
  },
});

// ── list_scenes ─────────────────────────────────────────────────────────────

export const listScenesTool = defineTool({
  name: "list_scenes",
  label: "List Scenes",
  description:
    "Lists all narrative scenes. Optionally filter by act and/or " +
    "chapter. Returns summary metadata for each scene.",
  parameters: ListScenesParamsSchema,
  execute: async (_toolCallId, params: ListScenesParams) => {
    const dir = DEFAULT_SCENES_DIR;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Directory doesn't exist yet — return empty list
      const result: ListScenesResult = { scenes: [] };
      return okResult(result);
    }

    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
    const scenes: ListScenesResultItem[] = [];

    for (const entry of mdFiles) {
      const raw = await readFile(join(dir, entry.name), "utf-8");
      const parsed = parseScene(raw);
      if (!parsed.ok) continue;

      const doc = parsed.data;

      // Optional act/chapter filtering via customFields
      // ponytail: act/chapter not in standard metadata schema; check customFields only
      if (params.act && doc.customFields["act"] !== params.act) continue;
      if (params.chapter && doc.customFields["chapter"] !== params.chapter) continue;

      scenes.push({
        id: doc.id,
        title: doc.title,
        status: SceneStatus[doc.status] ?? String(doc.status),
        wordCount: wordCount(doc.prose),
      });
    }

    scenes.sort((a, b) => a.id.localeCompare(b.id));

    const result: ListScenesResult = { scenes };
    return okResult(result);
  },
});
