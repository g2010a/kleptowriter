import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { ChapterAssembly, ChapterCandidate, ChapterEdit } from "../data-model/chapter/types.js";
import type { SceneDocument, SceneMetadata } from "../data-model/scene/types.js";

export interface ChapterBreak {
  afterSceneIndex: number;
  reasons: BreakReason[];
  confidence: number;
}

export interface BreakReason {
  type: "pov-change" | "time-jump" | "location-shift" | "tension-climax" | "plot-resolution" | "thematic-shift";
  strength: number;
  description: string;
}

export class ChapterDeductor {
  deduce(scenes: SceneDocument[], context: { bible?: StoryBible } = {}): ChapterCandidate[] {
    if (scenes.length === 0) return [];

    const breaks: ChapterBreak[] = [];
    let chapterStart = 0;

    for (let index = 0; index < scenes.length - 1; index++) {
      const current = scenes[index];
      const next = scenes[index + 1];
      if (!current || !next) continue;

      const reasons = [
        this.detectPovChange(current.metadata, next.metadata),
        this.detectTimeJump(current.metadata, next.metadata),
        this.detectLocationShift(current.metadata, next.metadata),
        this.detectThematicShift(current.metadata, next.metadata),
      ].filter((reason): reason is BreakReason => reason !== null);

      const chapterScenes = scenes.slice(chapterStart, index + 1).map((scene) => scene.metadata);
      reasons.push(...this.detectTensionArc(chapterScenes), ...this.detectPlotResolution(chapterScenes, context.bible));

      const sceneCount = index - chapterStart + 1;
      const strongReasons = reasons.filter((reason) => {
        if (reason.type === "pov-change") return sceneCount > 2;
        if (reason.type === "location-shift") return sceneCount > 3;
        return true;
      });
      const confidence = score(strongReasons);

      if (confidence >= 0.55) {
        breaks.push({ afterSceneIndex: index, reasons: strongReasons, confidence });
        chapterStart = index + 1;
      }
    }

    return this.toCandidates(scenes, breaks);
  }

  private detectPovChange(sceneA: SceneMetadata, sceneB: SceneMetadata): BreakReason | null {
    if (!sceneA.pov || !sceneB.pov || sceneA.pov === sceneB.pov) return null;
    return {
      type: "pov-change",
      strength: 0.7,
      description: `POV changes from ${sceneA.pov} to ${sceneB.pov}`,
    };
  }

  private detectTimeJump(sceneA: SceneMetadata, sceneB: SceneMetadata): BreakReason | null {
    const first = parseTime(sceneA.chronology);
    const second = parseTime(sceneB.chronology);
    if (first === null || second === null) return null;

    const hours = Math.abs(second - first) / 3_600_000;
    if (hours <= 24) return null;

    return {
      type: "time-jump",
      strength: clamp(hours / 72),
      description: `Time jumps ${Math.round(hours)} hours`,
    };
  }

  private detectLocationShift(sceneA: SceneMetadata, sceneB: SceneMetadata): BreakReason | null {
    if (sceneA.locations.length === 0 || sceneB.locations.length === 0) return null;
    const stayed = sceneA.locations.some((location) => sceneB.locations.includes(location));
    if (stayed) return null;

    return {
      type: "location-shift",
      strength: 0.6,
      description: `Location shifts from ${sceneA.locations.join(", ")} to ${sceneB.locations.join(", ")}`,
    };
  }

  private detectTensionArc(scenes: SceneMetadata[]): BreakReason[] {
    if (scenes.length < 3) return [];
    const tensions = scenes.map((scene) => scene.tension).filter((value): value is number => typeof value === "number");
    if (tensions.length < 3) return [];

    const peak = Math.max(...tensions);
    const last = tensions[tensions.length - 1];
    const previous = tensions[tensions.length - 2];
    if (last === undefined || previous === undefined || peak < 0.75 || previous !== peak || peak - last < 0.25) return [];

    return [
      {
        type: "tension-climax",
        strength: clamp(peak - last + 0.35),
        description: "Tension peaks then releases",
      },
    ];
  }

  private detectPlotResolution(scenes: SceneMetadata[], bible?: StoryBible): BreakReason[] {
    const active = new Set<string>();
    for (const scene of scenes) for (const thread of scene.plotThreads) active.add(thread);

    const resolved = [...active].filter((thread) => bible?.plotThreads.get(thread)?.status === "resolved");
    if (resolved.length > 0) {
      return [
        {
          type: "plot-resolution",
          strength: 0.75,
          description: `Plot thread resolves: ${resolved.join(", ")}`,
        },
      ];
    }

    const previous = scenes.at(-2)?.plotThreads ?? [];
    const current = scenes.at(-1)?.plotThreads ?? [];
    const dropped = previous.filter((thread) => !current.includes(thread));
    if (dropped.length === 0) return [];

    return [
      {
        type: "plot-resolution",
        strength: 0.55,
        description: `Plot thread leaves focus: ${dropped.join(", ")}`,
      },
    ];
  }

  finalize(candidates: ChapterCandidate[], edits: ChapterEdit[] = []): ChapterAssembly[] {
    const edited: ChapterCandidate[] = candidates.map((candidate) => ({ ...candidate, sceneIds: [...candidate.sceneIds] }));

    for (const edit of edits) {
      const index = edited.findIndex((candidate) => candidate.id === edit.chapterId);
      if (index === -1) continue;
      const current = edited[index];
      if (!current) continue;

      if (edit.action === "rename" && typeof edit.params?.title === "string") {
        edited[index] = { ...current, title: edit.params.title };
      } else if (edit.action === "merge" && typeof edit.params?.withChapterId === "string") {
        const otherIndex = edited.findIndex((candidate) => candidate.id === edit.params?.withChapterId);
        const other = edited[otherIndex];
        if (otherIndex !== -1 && current && other) {
          current.sceneIds.push(...other.sceneIds);
          edited.splice(otherIndex, 1);
        }
      } else if (edit.action === "split" && typeof edit.params?.afterSceneIndex === "number") {
        const splitAt = edit.params.afterSceneIndex + 1;
        const nextScenes = current.sceneIds.splice(splitAt);
        if (nextScenes.length > 0) {
          edited.splice(index + 1, 0, {
            ...current,
            id: `${current.id}-split`,
            title: `${current.title} Part 2`,
            sceneIds: nextScenes,
          });
        }
      }
    }

    const reordered = reorder(edited, edits);
    return reordered.map((candidate, sortOrder) => ({
      id: candidate.id,
      title: candidate.title,
      description: candidate.breakReason,
      sortOrder,
      scenes: candidate.sceneIds,
      type: "narrative",
    }));
  }

  private toCandidates(scenes: SceneDocument[], breaks: ChapterBreak[]): ChapterCandidate[] {
    const candidates: ChapterCandidate[] = [];
    let start = 0;

    for (const chapterBreak of breaks) {
      candidates.push(createCandidate(candidates.length, scenes.slice(start, chapterBreak.afterSceneIndex + 1), chapterBreak));
      start = chapterBreak.afterSceneIndex + 1;
    }

    candidates.push(createCandidate(candidates.length, scenes.slice(start), undefined));
    return candidates;
  }

  private detectThematicShift(sceneA: SceneMetadata, sceneB: SceneMetadata): BreakReason | null {
    if (sceneA.thematicMotifs.length === 0 || sceneB.thematicMotifs.length === 0) return null;
    const overlap = sceneA.thematicMotifs.some((motif) => sceneB.thematicMotifs.includes(motif));
    if (overlap) return null;

    return {
      type: "thematic-shift",
      strength: 0.55,
      description: `Theme shifts from ${sceneA.thematicMotifs.join(", ")} to ${sceneB.thematicMotifs.join(", ")}`,
    };
  }
}

function createCandidate(index: number, scenes: SceneDocument[], chapterBreak?: ChapterBreak): ChapterCandidate {
  return {
    id: `chapter-${index + 1}`,
    title: `Chapter ${index + 1}`,
    sceneIds: scenes.map((scene) => scene.id),
    confidence: chapterBreak?.confidence ?? 0.5,
    breakReason: chapterBreak?.reasons.map((reason) => reason.description).join("; ") ?? "No strong break detected",
  };
}

function score(reasons: BreakReason[]): number {
  if (reasons.length === 0) return 0;
  const strongest = Math.max(...reasons.map((reason) => reason.strength));
  return clamp(strongest + (reasons.length - 1) * 0.1);
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function reorder(candidates: ChapterCandidate[], edits: ChapterEdit[]): ChapterCandidate[] {
  const order = edits.find((edit) => edit.action === "reorder")?.params?.chapterIds;
  if (!Array.isArray(order)) return candidates;

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const ordered = order.flatMap((id) => (typeof id === "string" && byId.has(id) ? [byId.get(id)!] : []));
  return [...ordered, ...candidates.filter((candidate) => !order.includes(candidate.id))];
}
