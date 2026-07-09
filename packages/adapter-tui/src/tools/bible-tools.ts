/**
 * Bible tools — real implementations of query_bible and update_bible.
 *
 * These use Task 3 schemas and return Pi-compatible { content, details }.
 * The bible instance is held module-level; call setBible() after loading.
 *
 * ponytail: module-level singleton bible. Add when multiple concurrent
 * bible sessions are needed.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import { QueryBibleParamsSchema, UpdateBibleParamsSchema } from "./types.js";
import type { QueryBibleParams, UpdateBibleParams } from "./types.js";
import { saveBible } from "../bible/persistence.js";

const DEFAULT_SAVE_PATH = "./story/story-metadata.json";

// ── Module-level bible holder ───────────────────────────────────────────────

let _bible: InMemoryStoryBible = new InMemoryStoryBible();
let _biblePath: string | undefined;

/** Set the active bible instance and optional save path. */
export function setBible(bible: InMemoryStoryBible, savePath?: string): void {
  _bible = bible;
  _biblePath = savePath;
}

/** Get the active bible instance. */
export function getBible(): InMemoryStoryBible {
  return _bible;
}

/** Get the save path (if set). */
export function getBiblePath(): string | undefined {
  return _biblePath;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

/** Match a string against an optional case-insensitive filter. */
function matchesFilter(value: string, filter?: string): boolean {
  if (!filter) return true;
  return value.toLocaleLowerCase().includes(filter.toLocaleLowerCase());
}

// ── query_bible ─────────────────────────────────────────────────────────────

export const queryBibleTool = defineTool({
  name: "query_bible",
  label: "Query Bible",
  description:
    "Queries the story bible for characters, locations, or plot " +
    "threads. An optional text filter narrows results by name or " +
    "field content.",
  parameters: QueryBibleParamsSchema,
  execute: async (_toolCallId, params: QueryBibleParams) => {
    const { type, filter } = params;
    let results: Record<string, unknown>[] = [];

    switch (type) {
      case "characters": {
        const chars = filter
          ? _bible.queryCharacters({ name: filter })
          : [..._bible.characters.values()];
        results = chars.map((c) => ({
          id: c.id,
          name: c.name,
          aliases: c.aliases,
          tags: c.tags,
          traits: c.traits,
          relationships: Object.fromEntries(c.relationships),
          arcBeatIds: c.arcBeatIds,
          lastSeenScene: c.lastSeenScene,
        }));
        break;
      }
      case "locations": {
        const locs = [..._bible.locations.values()];
        const filtered = filter
          ? locs.filter((l) => matchesFilter(l.name, filter) || l.aliases.some((a) => matchesFilter(a, filter)))
          : locs;
        results = filtered.map((l) => ({
          id: l.id,
          name: l.name,
          aliases: l.aliases,
          tags: l.tags,
          description: l.description,
          relatedLocations: l.relatedLocations,
        }));
        break;
      }
      case "plotThreads": {
        const threads = [..._bible.plotThreads.values()];
        const filtered = filter
          ? threads.filter(
              (t) =>
                matchesFilter(t.name, filter) ||
                matchesFilter(t.description, filter),
            )
          : threads;
        results = filtered.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          status: t.status,
          relatedSceneIds: t.relatedSceneIds,
        }));
        break;
      }
    }

    return {
      content: textContent(JSON.stringify({ type, count: results.length, results }, null, 2)),
      details: { results, count: results.length, type },
    };
  },
});

// ── update_bible ────────────────────────────────────────────────────────────

export const updateBibleTool = defineTool({
  name: "update_bible",
  label: "Update Bible",
  description:
    "Adds or replaces an entity in the story bible. Specify the " +
    "entity type, unique ID, and data object. Returns success status " +
    "and the updated bible version.",
  parameters: UpdateBibleParamsSchema,
  execute: async (_toolCallId, params: UpdateBibleParams) => {
    const { type, id, data } = params;

    try {
      switch (type) {
        case "characters":
          _bible.characters.set(id, {
            id,
            name: (data.name as string) ?? id,
            aliases: (data.aliases as string[]) ?? [],
            tags: (data.tags as string[]) ?? [],
            traits: (data.traits as Record<string, string>) ?? {},
            relationships: new Map(
              data.relationships ? Object.entries(data.relationships as Record<string, string>) : [],
            ),
            knowledge: new Set(data.knowledge as string[] ?? []),
            arcBeatIds: (data.arcBeatIds as string[]) ?? [],
            lastSeenScene: data.lastSeenScene as string | undefined,
          });
          break;
        case "locations":
          _bible.locations.set(id, {
            id,
            name: (data.name as string) ?? id,
            aliases: (data.aliases as string[]) ?? [],
            tags: (data.tags as string[]) ?? [],
            description: (data.description as string) ?? "",
            relatedLocations: (data.relatedLocations as string[]) ?? [],
          });
          break;
        case "plotThreads":
          _bible.plotThreads.set(id, {
            id,
            name: (data.name as string) ?? id,
            description: (data.description as string) ?? "",
            status: (data.status as "introduced" | "developed" | "resolved" | "dropped") ?? "introduced",
            relatedSceneIds: (data.relatedSceneIds as string[]) ?? [],
          });
          break;
      }

      // Auto-save if path is set (saveBible increments version)
      if (_biblePath) {
        await saveBible(_bible, _biblePath);
      }

      const version = _bible.version;
      const summary = `Updated ${type}/${id} — version ${version}`;

      return {
        content: textContent(summary),
        details: { ok: true, version, error: undefined } as { ok: boolean; version: number; error?: string },
      };
    } catch (err) {
      const msg = `Failed to update ${type}/${id}: ${err}`;
      return {
        content: textContent(msg),
        details: { ok: false, version: _bible.version, error: msg } as { ok: boolean; version: number; error?: string },
      };
    }
  },
});
