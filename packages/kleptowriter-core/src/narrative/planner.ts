import type { CharacterState, PlotThread, StoryBible } from "../data-model/bible/interfaces.js";
import type { ScenePlan } from "./types.js";

export interface PlannerState {
  currentSceneIndex: number;
  completedBeats: string[];
  activePlotThreads: string[];
  activeCharacterIds?: string[];
}

export class ScenePlanner {
  enrich(purpose: string, bible: StoryBible, state: PlannerState): ScenePlan {
    const characters = rankedCharacters(purpose, bible, state);
    const plotThreads = activePlotThreads(bible, state);

    return {
      beatId: beatIdFor(purpose),
      purpose,
      suggestedPov: characters[0]?.id,
      suggestedCharacters: characters.map((character) => character.id),
      targetTension: targetTension(state),
      plotThreads: plotThreads.map((thread) => thread.id),
      dramaticQuestions: openDramaticQuestions(bible),
      thematicMotifs: strongestThemes(bible),
    };
  }

  generateAlternatives(purpose: string, bible: StoryBible, state: PlannerState, count: number): ScenePlan[] {
    const total = Math.max(0, Math.floor(count));
    const povs = rankedCharacters(purpose, bible, state);
    const threads = activePlotThreads(bible, state);
    const tensions = [3, 6, 8];

    return Array.from({ length: total }, (_, index) => {
      const pov = povs[index % Math.max(1, povs.length)];
      const thread = threads[index % Math.max(1, threads.length)];
      const focus = thread?.id ?? pov?.id ?? `variant-${index + 1}`;
      const variantPurpose = `${purpose} (variant ${index + 1}: ${focus})`;
      const plan = this.enrich(variantPurpose, bible, state);

      return {
        ...plan,
        suggestedPov: pov?.id ?? plan.suggestedPov,
        targetTension: tensions[index % tensions.length] ?? plan.targetTension,
        plotThreads: thread ? [thread.id, ...plan.plotThreads.filter((id) => id !== thread.id)] : plan.plotThreads,
      };
    });
  }
}

function rankedCharacters(purpose: string, bible: StoryBible, state: PlannerState): CharacterState[] {
  const needle = purpose.toLocaleLowerCase();

  return [...bible.characters.values()].sort((left, right) => {
    const leftScore = characterScore(left, needle, state);
    const rightScore = characterScore(right, needle, state);
    return rightScore - leftScore || left.name.localeCompare(right.name);
  });
}

function characterScore(character: CharacterState, needle: string, state: PlannerState): number {
  const searchable = [character.id, character.name, ...(character.aliases ?? []), ...(character.tags ?? [])]
    .join(" ")
    .toLocaleLowerCase();
  let score = searchable
    .split(/\s+/)
    .filter((word) => word.length > 2 && needle.includes(word)).length;

  if (state.activeCharacterIds?.includes(character.id)) score += 4;
  if ((character.arcBeatIds ?? []).some((beatId) => state.completedBeats.includes(beatId))) score += 2;
  if (character.lastSeenScene) score += 1;
  return score;
}

function activePlotThreads(bible: StoryBible, state: PlannerState): PlotThread[] {
  const unresolved = [...bible.plotThreads.values()].filter((thread) => thread.status !== "resolved" && thread.status !== "dropped");
  const preferred = unresolved.filter((thread) => state.activePlotThreads.includes(thread.id));
  const remaining = unresolved.filter((thread) => !state.activePlotThreads.includes(thread.id));
  return [...preferred, ...remaining];
}

function openDramaticQuestions(bible: StoryBible): string[] {
  return [...bible.dramaticQuestions.values()]
    .filter((question) => question.status !== "answered")
    .map((question) => question.id);
}

function strongestThemes(bible: StoryBible): string[] {
  return [...bible.thematicProgression.themes]
    .sort((left, right) => right[1].intensity - left[1].intensity)
    .map(([theme]) => theme);
}

function targetTension(state: PlannerState): number {
  const progress = state.currentSceneIndex / Math.max(1, state.currentSceneIndex + state.completedBeats.length + 1);
  return Math.min(10, Math.max(1, Math.round(3 + progress * 6 + state.activePlotThreads.length)));
}

function beatIdFor(purpose: string): string {
  const slug = purpose
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "scene-beat";
}
