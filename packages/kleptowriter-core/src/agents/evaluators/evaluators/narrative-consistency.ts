import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { EvaluationVerdict } from "../../../types/scene.js";

export interface NarrativeConsistencyEvaluation {
  evaluatorId: string;
  role: "narrative-consistency";
  score: number;
  verdict: EvaluationVerdict;
  findings: string[];
  iterationCount: number;
}

export type NarrativeConsistencyEvaluator = (
  scene: SceneDocument,
  bible: StoryBible,
  context: NarrativeConsistencyContext,
) => NarrativeConsistencyEvaluation;

export interface NarrativeConsistencyContext {
  previousScenes: SceneDocument[];
  continuityChecks: string[];
  iterationCount: number;
}

export function createNarrativeConsistencyEvaluator(): NarrativeConsistencyEvaluator {
  return (scene: SceneDocument, bible: StoryBible, context: NarrativeConsistencyContext): NarrativeConsistencyEvaluation => {
    const checks: Array<[boolean, string]> = [];

    const previousThreads = collectPreviousPlotThreads(context.previousScenes);
    const openThreads = previousThreads.filter((id) => {
      const thread = bible.plotThreads.get(id);
      return thread && (thread.status === "introduced" || thread.status === "developed");
    });
    const currentThreads = scene.metadata.plotThreads;
    const continuedThreads = currentThreads.filter((t) => openThreads.includes(t));

    if (openThreads.length === 0) {
      checks.push([true, "No open plot threads from previous scenes to continue."]);
    } else {
      checks.push([
        continuedThreads.length > 0,
        continuedThreads.length > 0
          ? `Scene continues ${continuedThreads.length} open plot thread(s) from previous scenes: ${continuedThreads.join(", ")}.`
          : `Scene does not continue any of the ${openThreads.length} open plot thread(s) from previous scenes: ${openThreads.join(", ")}.`,
      ]);
    }

    if (scene.metadata.characters.length === 0) {
      checks.push([false, "Scene metadata lists no characters."]);
    } else {
      const consistentChars: string[] = [];
      const inconsistentChars: string[] = [];
      const unknownChars: string[] = [];

      for (const charId of scene.metadata.characters) {
        const charBible = bible.characters.get(charId);
        if (!charBible) {
          unknownChars.push(charId);
          continue;
        }
        const traitValues = Object.values(charBible.traits).filter((v) => v.length > 0);
        const lowerProse = scene.prose.toLowerCase();
        const traitsReflected = traitValues.filter((t) => lowerProse.includes(t.toLowerCase()));

        if (traitValues.length === 0 || traitsReflected.length >= 1) {
          consistentChars.push(charId);
        } else {
          inconsistentChars.push(charId);
        }
      }

      checks.push([
        inconsistentChars.length === 0,
        inconsistentChars.length === 0
          ? `All ${scene.metadata.characters.length} scene characters act consistently with their established traits.`
          : `Characterization inconsistencies for: ${inconsistentChars.join(", ")}.`,
      ]);

      if (unknownChars.length > 0) {
        checks.push([false, `Unknown characters in scene metadata: ${unknownChars.join(", ")}.`]);
      }
    }

    const passed = checks.filter(([ok]) => ok);
    const score = Math.round((passed.length / checks.length) * 100);

    return {
      evaluatorId: "narrative-consistency",
      role: "narrative-consistency",
      score,
      verdict: score >= 80 ? "pass" : score >= 50 ? "conditional" : "reject",
      findings: checks.map(([ok, finding]) => `${ok ? "PASS" : "FAIL"}: ${finding}`),
      iterationCount: context.iterationCount,
    };
  };
}

function collectPreviousPlotThreads(previousScenes: SceneDocument[]): string[] {
  const threads = new Set<string>();
  for (const scene of previousScenes) {
    for (const thread of scene.metadata.plotThreads) {
      threads.add(thread);
    }
  }
  return [...threads];
}

export const narrativeConsistencyEvaluator = createNarrativeConsistencyEvaluator();

// Stub for backward compatibility – delegates to the real evaluator.
export const narrativeConsistencyStub = narrativeConsistencyEvaluator;
