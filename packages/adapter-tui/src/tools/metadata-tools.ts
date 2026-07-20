/**
 * Metadata tools — real implementations of query_metadata and update_metadata.
 *
 * These use Task 3 schemas and return Pi-compatible { content, details }.
 * The metadata instance is held module-level; call setMetadata() after loading.
 *
 * ponytail: module-level singleton metadata. Add when multiple concurrent
 * metadata sessions are needed.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { InMemoryStoryBible, type StylometryProfile } from "@kleptowriter/kleptowriter-core";
import { QueryMetadataParamsSchema, UpdateMetadataParamsSchema } from "./types.js";
import type { QueryMetadataParams, UpdateMetadataParams } from "./types.js";
import { saveMetadata } from "../metadata/persistence.js";

const DEFAULT_SAVE_PATH = "./story/story-metadata.json";

// ── Module-level metadata holder ────────────────────────────────────────────

let _metadata: InMemoryStoryBible = new InMemoryStoryBible();
let _metadataPath: string | undefined;

/** Set the active metadata instance and optional save path. */
export function setMetadata(bible: InMemoryStoryBible, savePath?: string): void {
  _metadata = bible;
  _metadataPath = savePath;
}

/** Get the active metadata instance. */
export function getMetadata(): InMemoryStoryBible {
  return _metadata;
}

/** Get the save path (if set). */
export function getMetadataPath(): string | undefined {
  return _metadataPath;
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

// ── query_metadata ──────────────────────────────────────────────────────────

export const queryMetadataTool = defineTool({
  name: "query_metadata",
  label: "Query Metadata",
  description:
    "Queries the story metadata for characters, locations, or plot " +
    "threads. An optional text filter narrows results by name or " +
    "field content.",
  parameters: QueryMetadataParamsSchema,
  execute: async (_toolCallId, params: QueryMetadataParams) => {
    const { type, filter } = params;
    let results: Record<string, unknown>[] = [];

    switch (type) {
      case "characters": {
        const chars = filter
          ? _metadata.queryCharacters({ name: filter })
          : [..._metadata.characters.values()];
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
        const locs = [..._metadata.locations.values()];
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
        const threads = [..._metadata.plotThreads.values()];
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
      case "stylometry": {
        const stylometry = _metadata.stylometry;
        results = stylometry ? [stylometry as Record<string, unknown>] : [];
        break;
      }
    }

    return {
      content: textContent(JSON.stringify({ type, count: results.length, results }, null, 2)),
      details: { results, count: results.length, type },
    };
  },
});

// ── update_metadata ─────────────────────────────────────────────────────────

export const updateMetadataTool = defineTool({
  name: "update_metadata",
  label: "Update Metadata",
  description:
    "Adds or replaces an entity in the story metadata. Specify the " +
    "entity type, unique ID, and data object. Returns success status " +
    "and the updated metadata version.",
  parameters: UpdateMetadataParamsSchema,
  execute: async (_toolCallId, params: UpdateMetadataParams) => {
    const { type, id, data } = params;

    try {
      switch (type) {
        case "characters":
          _metadata.characters.set(id, {
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
          _metadata.locations.set(id, {
            id,
            name: (data.name as string) ?? id,
            aliases: (data.aliases as string[]) ?? [],
            tags: (data.tags as string[]) ?? [],
            description: (data.description as string) ?? "",
            relatedLocations: (data.relatedLocations as string[]) ?? [],
          });
          break;
        case "plotThreads":
          _metadata.plotThreads.set(id, {
            id,
            name: (data.name as string) ?? id,
            description: (data.description as string) ?? "",
            status: (data.status as "introduced" | "developed" | "resolved" | "dropped") ?? "introduced",
            relatedSceneIds: (data.relatedSceneIds as string[]) ?? [],
          });
          break;
        case "stylometry":
          _metadata.stylometry = data as StylometryProfile;
          break;
      }

      // Auto-save to default if no path set (saveMetadata increments version)
      const savePath = _metadataPath ?? DEFAULT_SAVE_PATH;
      await saveMetadata(_metadata, savePath);

      const version = _metadata.version;
      const summary = `Updated ${type}/${id} — version ${version}`;

      return {
        content: textContent(summary),
        details: { ok: true, version, error: undefined } as { ok: boolean; version: number; error?: string },
      };
    } catch (err) {
      const msg = `Failed to update ${type}/${id}: ${err}`;
      return {
        content: textContent(msg),
        details: { ok: false, version: _metadata.version, error: msg } as { ok: boolean; version: number; error?: string },
      };
    }
  },
});
