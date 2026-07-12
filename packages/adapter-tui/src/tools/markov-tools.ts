import { defineTool } from "@earendil-works/pi-coding-agent";
import { MarkovInferenceEngine } from "@kleptowriter/kleptowriter-core";
import type { Transition } from "@kleptowriter/kleptowriter-core";
import { templateRegistry } from "@kleptowriter/kleptowriter-core/narrative/templates/index.js";
import type { NarrativeStructure } from "@kleptowriter/kleptowriter-core/narrative/templates/index.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { SuggestNextBeatParamsSchema } from "./types.js";
import type { SuggestNextBeatParams, SuggestNextBeatResult, SuggestNextBeatSuggestion, SuggestNextBeatStopReason } from "./types.js";

const DEFAULT_SCENES_DIR = "./story/scenes";
const DEFAULT_TEMPLATE = "Three-Act Structure";

function okResult(result: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    details: result,
  };
}

function parseSceneId(sceneId: string): { beat: string; sequence: number } | null {
  const parts = sceneId.split("-");
  for (let i = 0; i < parts.length; i++) {
    if (/^\d{2}$/.test(parts[i]!)) {
      return { beat: parts.slice(0, i).join("-"), sequence: parseInt(parts[i]!, 10) };
    }
  }
  return null;
}

function buildTransitions(structure: NarrativeStructure): Transition[] {
  const transitions: Transition[] = [];
  for (const beat of structure.beats) {
    for (const t of beat.transitions) {
      transitions.push({ from: beat.id, to: t.to, weight: t.weight });
    }
  }
  return transitions;
}

function getBeatDescriptions(structure: NarrativeStructure): Map<string, string> {
  const map = new Map<string, string>();
  for (const beat of structure.beats) {
    map.set(beat.id, beat.description);
  }
  return map;
}

function resolveCurrentBeat(
  scenes: { beat: string; sequence: number }[],
  beatOrder: Map<string, number>,
): { currentBeat: string; history: string[] } {
  const sorted = [...scenes].sort((a, b) => {
    const ai = beatOrder.get(a.beat) ?? -1;
    const bi = beatOrder.get(b.beat) ?? -1;
    if (ai !== bi) return ai - bi;
    return a.sequence - b.sequence;
  });

  const last = sorted[sorted.length - 1]!;
  const history = sorted.slice(0, -1).map((s) => s.beat);
  return { currentBeat: last.beat, history };
}

async function loadScenes(scenesDir: string): Promise<{ beat: string; sequence: number }[]> {
  let entries;
  try {
    entries = await readdir(scenesDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const scenes: { beat: string; sequence: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const sceneId = entry.name.replace(/\.md$/, "");
    const parsed = parseSceneId(sceneId);
    if (parsed) scenes.push(parsed);
  }
  return scenes;
}

export const suggestNextBeatTool = defineTool({
  name: "suggest_next_beat",
  label: "Suggest Next Beat",
  description:
    "Suggests the next narrative beat based on existing scenes and a " +
    "Markov model trained on a narrative template. Returns the sampled " +
    "beat, the current beat, and the template name.",
  parameters: SuggestNextBeatParamsSchema,
  execute: async (_toolCallId, params: SuggestNextBeatParams) => {
    const templateName = params.template ?? DEFAULT_TEMPLATE;
    const structure = templateRegistry.getStructure(templateName);

    if (!structure) {
      const result: SuggestNextBeatResult = {
        suggestions: [],
        currentBeat: "",
        template: templateName,
      };
      return okResult(result);
    }

    const engine = new MarkovInferenceEngine();
    engine.train(buildTransitions(structure));

    const scenes = await loadScenes(DEFAULT_SCENES_DIR);
    const descriptions = getBeatDescriptions(structure);
    const beatOrder = new Map(structure.beats.map((b, i) => [b.id, i]));

    const loopMode = params.maxBeats !== undefined || params.maxSameBeatRepeats !== undefined;
    const maxBeats = params.maxBeats ?? 20;
    const maxSameBeatRepeats = params.maxSameBeatRepeats ?? 3;

    let suggestions: SuggestNextBeatSuggestion[];
    let currentBeat: string;
    let stoppedReason: SuggestNextBeatStopReason | undefined;

    if (scenes.length === 0) {
      const firstBeat = structure.beats[0]!;
      currentBeat = "";

      if (!loopMode) {
        suggestions = [{
          beat: firstBeat.id,
          probability: 1,
          description: firstBeat.description,
        }];
      } else {
        suggestions = [];
        let consecutiveCount = 0;
        let lastBeatType = "";
        let currentBeatId = firstBeat.id;

        for (let i = 0; i < maxBeats; i++) {
          const desc = descriptions.get(currentBeatId) ?? "";
          suggestions.push({ beat: currentBeatId, probability: 1, description: desc });

          if (currentBeatId === lastBeatType) {
            consecutiveCount++;
          } else {
            consecutiveCount = 1;
            lastBeatType = currentBeatId;
          }

          if (consecutiveCount >= maxSameBeatRepeats) {
            stoppedReason = "max_repeats_reached";
            break;
          }

          if (i < maxBeats - 1) {
            const sampled = engine.sample(currentBeatId, []);
            if (!sampled) {
              stoppedReason = "natural_completion";
              break;
            }
            currentBeatId = sampled;
          }
        }

        if (!stoppedReason) {
          stoppedReason = "max_beats_reached";
        }
      }
    } else {
      const { currentBeat: cb, history } = resolveCurrentBeat(scenes, beatOrder);
      currentBeat = cb;

      if (!loopMode) {
        const sampled = engine.sample(currentBeat, history);
        suggestions = sampled
          ? [{ beat: sampled, probability: 1, description: descriptions.get(sampled) ?? "" }]
          : [];
      } else {
        suggestions = [];
        let consecutiveCount = 0;
        let lastBeatType = "";
        let currentBeatId = currentBeat;
        const hist = [...history];

        for (let i = 0; i < maxBeats; i++) {
          const sampled = engine.sample(currentBeatId, hist);
          if (!sampled) {
            stoppedReason = "natural_completion";
            break;
          }

          const desc = descriptions.get(sampled) ?? "";
          suggestions.push({ beat: sampled, probability: 1, description: desc });

          if (sampled === lastBeatType) {
            consecutiveCount++;
          } else {
            consecutiveCount = 1;
            lastBeatType = sampled;
          }

          if (consecutiveCount >= maxSameBeatRepeats) {
            stoppedReason = "max_repeats_reached";
            break;
          }

          currentBeatId = sampled;
          hist.push(sampled);
        }

        if (!stoppedReason) {
          stoppedReason = "max_beats_reached";
        }
      }
    }

    const result: SuggestNextBeatResult = {
      suggestions,
      currentBeat: scenes.length === 0 ? "" : currentBeat!,
      template: templateName,
    };
    if (stoppedReason !== undefined) {
      result.stoppedReason = stoppedReason;
    }
    return okResult(result);
  },
});
