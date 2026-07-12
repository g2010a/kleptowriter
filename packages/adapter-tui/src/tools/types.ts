/**
 * TypeScript interfaces and TypeBox schemas for Kleptowriter core tools.
 *
 * Each tool defines:
 *  - A TypeBox schema (for Pi SDK parameter validation via `defineTool({ parameters, ... })`)
 *  - A `Static`-derived TypeScript type alias for its parameter object
 *  - A TypeScript interface for its result shape
 *
 * Schema contracts match `.omo/plans/kleptowriter-pi-harness.md` Task 3 exactly.
 * No business logic — pure type definitions consumed by the tool registry.
 */

import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import type { SceneDocument } from "@kleptowriter/kleptowriter-core";

// ── write_scene ─────────────────────────────────────────────────────────────
// Creates or overwrites a narrative scene file. The LLM provides structured
// scene fields (id, title, prose) plus a metadata sub-object matching
// SceneMetadata shape. The tool serialises to disk and returns the path.

export const WriteSceneMetadataSchema = Type.Object({
  pov: Type.String({ description: "Point-of-view character ID" }),
  characters: Type.Array(Type.String(), { description: "Character IDs present in the scene" }),
  locations: Type.Array(Type.String(), { description: "Location IDs where the scene takes place" }),
  chronology: Type.String({ description: "Temporal placement (e.g. 'act-2', 'evening')" }),
  tension: Type.Number({ description: "Tension level 0–10" }),
  mood: Type.String({ description: "Atmospheric mood descriptor" }),
  plotThreads: Type.Array(Type.String(), { description: "Plot-thread IDs advanced by this scene" }),
  thematicMotifs: Type.Array(Type.String(), { description: "Thematic motif tags" }),
});

export const WriteSceneParamsSchema = Type.Object({
  sceneId: Type.String({ description: "Unique scene identifier (slug)" }),
  title: Type.String({ description: "Scene title" }),
  prose: Type.String({ description: "Scene prose body (markdown)" }),
  metadata: WriteSceneMetadataSchema,
});
export type WriteSceneParams = Static<typeof WriteSceneParamsSchema>;

export interface WriteSceneResult {
  ok: boolean;
  path: string;
  error?: string;
}

// ── read_scene ──────────────────────────────────────────────────────────────
// Reads a scene file by its ID and returns the full SceneDocument when found,
// or an error string when it does not exist.

export const ReadSceneParamsSchema = Type.Object({
  sceneId: Type.String({ description: "Scene identifier to read" }),
});
export type ReadSceneParams = Static<typeof ReadSceneParamsSchema>;

export interface ReadSceneResult {
  ok: boolean;
  scene?: SceneDocument;
  error?: string;
}

// ── list_scenes ─────────────────────────────────────────────────────────────
// Enumerates all scene files, optionally filtered by act and/or chapter.
// Returns summary metadata for each matching scene.

export const ListScenesParamsSchema = Type.Object({
  act: Type.Optional(Type.String({ description: "Act filter (e.g. 'act-1')" })),
  chapter: Type.Optional(Type.String({ description: "Chapter filter (e.g. 'chapter-3')" })),
});
export type ListScenesParams = Static<typeof ListScenesParamsSchema>;

export interface ListScenesResultItem {
  id: string;
  title: string;
  status: string;
  wordCount: number;
}

export interface ListScenesResult {
  scenes: ListScenesResultItem[];
}

// ── query_metadata ──────────────────────────────────────────────────────────
// Queries the story metadata by entity type with an optional text filter.
// Returns an array of matching entity objects.

export const MetadataEntityTypeSchema = Type.Union([
  Type.Literal("characters"),
  Type.Literal("locations"),
  Type.Literal("plotThreads"),
]);

export const QueryMetadataParamsSchema = Type.Object({
  type: MetadataEntityTypeSchema,
  filter: Type.Optional(Type.String({ description: "Text filter applied to entity name or fields" })),
});
export type QueryMetadataParams = Static<typeof QueryMetadataParamsSchema>;

export interface QueryMetadataResult {
  results: Record<string, unknown>[];
}

// ── update_metadata ─────────────────────────────────────────────────────────
// Upserts an entity (character, location, or plot-thread) in the story metadata.
// Replaces all data for the given id within the given type collection.

export const UpdateMetadataParamsSchema = Type.Object({
  type: MetadataEntityTypeSchema,
  id: Type.String({ description: "Entity identifier (unique within its type)" }),
  data: Type.Record(Type.String(), Type.Unknown(), { description: "Entity data fields to persist" }),
});
export type UpdateMetadataParams = Static<typeof UpdateMetadataParamsSchema>;

export interface UpdateMetadataResult {
  ok: boolean;
  version: number;
}

// ── evaluate_prose ──────────────────────────────────────────────────────────
// Runs prose-quality evaluation on a written scene. Returns a verdict
// ("pass", "conditional", or "reject") together with a detailed report object.

export const EvaluateProseParamsSchema = Type.Object({
  sceneId: Type.String({ description: "Scene identifier to evaluate" }),
});
export type EvaluateProseParams = Static<typeof EvaluateProseParamsSchema>;

export type Verdict = "pass" | "conditional" | "reject";

export interface EvaluateProseResult {
  verdict: Verdict;
  report: Record<string, unknown>;
}

// ── deduce_chapters ──────────────────────────────────────────────────────
// Scans all written scenes from ./story/scenes, extracts narrative beats,
// runs core ChapterDeductor, and returns chapter groupings.

export const DeduceChaptersParamsSchema = Type.Object({});
export type DeduceChaptersParams = Static<typeof DeduceChaptersParamsSchema>;

export interface DeduceChaptersChapter {
  chapterNumber: number;
  title: string;
  scenes: string[];
  summary: string;
}

export interface DeduceChaptersActBreakdown {
  act: string;
  chapters: number[];
}

export interface DeduceChaptersResult {
  chapters: DeduceChaptersChapter[];
  actBreakdown?: DeduceChaptersActBreakdown[];
}

// ── load_context ────────────────────────────────────────────────────────────
// Gathers the current story state (bible snapshot + recent scenes) to inject
// into the LLM's context window. The optional sceneCount controls how many
// recent scenes are included (default: 5 at runtime).

export const LoadContextParamsSchema = Type.Object({
  sceneCount: Type.Optional(
    Type.Integer({
      description: "Number of recent scenes to include (default: 5 at runtime)",
      minimum: 1,
      maximum: 50,
    }),
  ),
});
export type LoadContextParams = Static<typeof LoadContextParamsSchema>;

export interface LoadContextRecentScene {
  id: string;
  title: string;
  status: string;
  wordCount: number;
  prose: string;
  metadata: {
    pov: string;
    characters: string[];
    locations: string[];
    chronology: string;
    tension: number;
    mood: string;
    plotThreads: string[];
    thematicMotifs: string[];
    dramaticQuestions: string[];
  };
  customFields: Record<string, unknown>;
}

export interface LoadContextResult {
  bible: Record<string, unknown>;
  recentScenes: LoadContextRecentScene[];
}

// ── suggest_next_beat ─────────────────────────────────────────────────────
// Scans existing scene files to infer narrative state, trains a Markov
// engine from the selected template's transitions, and predicts likely
// next beats with probabilities.

export const SuggestNextBeatParamsSchema = Type.Object({
  template: Type.Optional(
    Type.String({ description: "Narrative template name (default: Three-Act Structure)" }),
  ),
  maxBeats: Type.Optional(
    Type.Integer({ description: "Max beats to generate in loop mode (default: 20)", minimum: 2, maximum: 200 }),
  ),
  maxSameBeatRepeats: Type.Optional(
    Type.Integer({ description: "Stop after N consecutive same-beat types (default: 3)", minimum: 2, maximum: 20 }),
  ),
});
export type SuggestNextBeatParams = Static<typeof SuggestNextBeatParamsSchema>;

export interface SuggestNextBeatSuggestion {
  beat: string;
  probability: number;
  description: string;
}

export type SuggestNextBeatStopReason = "max_beats_reached" | "max_repeats_reached" | "natural_completion";

export interface SuggestNextBeatResult {
  suggestions: SuggestNextBeatSuggestion[];
  currentBeat: string;
  template: string;
  stoppedReason?: SuggestNextBeatStopReason;
}

// ── stylometry ────────────────────────────────────────────────────────────────
// Stylometry profile schema for story bible stylometric profiling.
// All 12 fields are optional strings for flexibility.

export const StylometryProfileSchema = Type.Object({
  narrativeVoice: Type.Optional(Type.String({ description: "Narrative voice (e.g., 'omniscient', 'first-person', 'close third')" })),
  povStyle: Type.Optional(Type.String({ description: "POV style (e.g., 'single viewpoint', 'multiple viewpoint', 'unreliable')" })),
  tensePreference: Type.Optional(Type.String({ description: "Tense preference (e.g., 'past', 'present')" })),
  vocabularyRegister: Type.Optional(Type.String({ description: "Vocabulary register (e.g., 'formal', 'colloquial', 'literary', 'vernacular')" })),
  sentenceLengthTarget: Type.Optional(Type.String({ description: "Sentence length target (e.g., 'short', 'varied', 'long flowing')" })),
  proseStyleNotes: Type.Optional(Type.String({ description: "Free-text prose style notes" })),
  dialogueStyleNotes: Type.Optional(Type.String({ description: "Free-text dialogue style notes" })),
  pacingPreference: Type.Optional(Type.String({ description: "Pacing preference (e.g., 'fast', 'measured', 'slow burn')" })),
  paragraphStructure: Type.Optional(Type.String({ description: "Paragraph structure (e.g., 'short paragraphs', 'mixed', 'dense blocks')" })),
  rhetoricalDevices: Type.Optional(Type.String({ description: "Rhetorical devices used (e.g., 'metaphor', 'imagery', 'minimalist')" })),
  commaStyle: Type.Optional(Type.String({ description: "Comma style preference (e.g., 'oxford comma', 'minimal', 'abundant')" })),
  dialogueTagPreference: Type.Optional(Type.String({ description: "Dialogue tag preference (e.g., 'said-only', 'varied tags', 'minimal tags')" })),
});
export type StylometryProfile = Static<typeof StylometryProfileSchema>;

// ── web_fetch ────────────────────────────────────────────────────────────────
// Fetches a URL, extracts article content via @mozilla/readability, and
// converts to Markdown via turndown + linkedom.

export const WebFetchParamsSchema = Type.Object({
  url: Type.String({ description: "URL to fetch and convert to markdown" }),
});
export type WebFetchParams = Static<typeof WebFetchParamsSchema>;

export interface WebFetchResult {
  success: boolean;
  url?: string;
  title?: string;
  content?: string;
  error?: string;
}
