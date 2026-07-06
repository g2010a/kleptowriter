import type { SceneMetadata } from "../data-model/scene/index.js";

export interface MetadataDiffResult {
  newCharacters: string[];
  missingCharacters: string[];
  locationChanges: { from?: string; to?: string }[];
  timelineGaps: { gapSize: number; note: string }[];
  tensionDelta: number;
  plotThreadChanges: { added: string[]; removed: string[] };
  inconsistencies: string[];
}

export class MetadataDiff {
  diff(previous: SceneMetadata, current: SceneMetadata): MetadataDiffResult {
    const newCharacters = this.findNewCharacters(previous, current);
    const missingCharacters = this.findMissingCharacters(previous, current);
    const timelineGaps = this.timelineGap(previous, current);
    const plotThreadChanges = {
      added: difference(current.plotThreads, previous.plotThreads),
      removed: difference(previous.plotThreads, current.plotThreads),
    };

    return {
      newCharacters,
      missingCharacters,
      locationChanges: this.locationChanged(previous, current),
      timelineGaps,
      tensionDelta: (current.tension ?? 0) - (previous.tension ?? 0),
      plotThreadChanges,
      inconsistencies: this.findInconsistencies(previous, current, missingCharacters, timelineGaps, plotThreadChanges.removed),
    };
  }

  private findNewCharacters(prev: SceneMetadata, curr: SceneMetadata): string[] {
    return difference(curr.characters, prev.characters);
  }

  private findMissingCharacters(prev: SceneMetadata, curr: SceneMetadata): string[] {
    return difference(prev.characters, curr.characters);
  }

  private locationChanged(prev: SceneMetadata, curr: SceneMetadata): { from?: string; to?: string }[] {
    if (prev.locations.length === 0 && curr.locations.length === 0) return [];
    if (prev.locations.some((location) => curr.locations.includes(location))) return [];

    return [{ from: prev.locations[0], to: curr.locations[0] }];
  }

  private timelineGap(prev: SceneMetadata, curr: SceneMetadata): { gapSize: number; note: string }[] {
    const previousTime = parseTimeline(prev.chronology);
    const currentTime = parseTimeline(curr.chronology);
    if (previousTime === null || currentTime === null) return [];

    const hours = Math.round((currentTime - previousTime) / 3_600_000);
    if (Math.abs(hours) <= 24) return [];

    return [{ gapSize: hours, note: hours < 0 ? `Timeline moves backward ${Math.abs(hours)} hours` : `Timeline jumps ${hours} hours` }];
  }

  private findInconsistencies(
    prev: SceneMetadata,
    curr: SceneMetadata,
    missingCharacters: string[],
    timelineGaps: { gapSize: number; note: string }[],
    removedPlotThreads: string[],
  ): string[] {
    const inconsistencies: string[] = [];

    if (curr.pov && !curr.characters.includes(curr.pov)) inconsistencies.push(`POV character ${curr.pov} is not present in current scene characters`);
    if (timelineGaps.some((gap) => gap.gapSize < 0)) inconsistencies.push("Current scene chronology is earlier than previous scene");
    if (missingCharacters.length > 0 && hasOpenContinuity(curr)) inconsistencies.push(`Active continuity drops characters: ${missingCharacters.join(", ")}`);
    if (removedPlotThreads.length > 0 && curr.dramaticQuestions.length > 0) inconsistencies.push(`Dramatic questions remain after plot threads disappeared: ${removedPlotThreads.join(", ")}`);
    if ((curr.tension ?? 0) < 0) inconsistencies.push("Current scene tension is below zero");

    const repeatedQuestions = intersection(prev.dramaticQuestions, curr.dramaticQuestions);
    const motifsDropped = difference(prev.thematicMotifs, curr.thematicMotifs);
    if (repeatedQuestions.length > 0 && motifsDropped.length > 0) {
      inconsistencies.push(`Dramatic questions persist while motifs disappear: ${motifsDropped.join(", ")}`);
    }

    return inconsistencies;
  }
}

function difference(values: string[], baseline: string[]): string[] {
  return [...new Set(values)].filter((value) => !baseline.includes(value));
}

function intersection(first: string[], second: string[]): string[] {
  return [...new Set(first)].filter((value) => second.includes(value));
}

function hasOpenContinuity(metadata: SceneMetadata): boolean {
  return metadata.plotThreads.length > 0 || metadata.dramaticQuestions.length > 0;
}

function parseTimeline(value: string | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}
