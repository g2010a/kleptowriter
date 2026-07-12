import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { EvaluationVerdict } from "../../../types/scene.js";
import type { EvaluationFinding } from "../../../eval/reports.js";

export interface FactCheckerEvaluation {
  evaluatorId: string;
  role: "fact-checker";
  score: number;
  verdict: EvaluationVerdict;
  findings: EvaluationFinding[];
  iterationCount: number;
}

export type FactCheckerEvaluator = (
  scene: SceneDocument,
  bible: StoryBible,
  context: FactCheckerContext,
) => FactCheckerEvaluation;

export interface FactCheckerContext {
  claims: string[];
  references: string[];
  iterationCount: number;
}

/**
 * Create a FactChecker evaluator.
 *
 * Performs two substantive checks:
 * 1. Internal consistency — scene characters/locations must exist in the Bible.
 * 2. Source alignment — biblical characters/locations must be mentioned in prose
 *    by name or alias.
 */
export function createFactChecker(): FactCheckerEvaluator {
  return (scene: SceneDocument, bible: StoryBible, context: FactCheckerContext): FactCheckerEvaluation => {
    const lowerProse = scene.prose.toLowerCase();
    const findings: EvaluationFinding[] = [];
    let passed = 0;
    let total = 0;

    // ── Check 1a: Character existence in Bible ──────────────────────────
    for (const charId of scene.metadata.characters) {
      total++;
      if (!bible.characters.has(charId)) {
        findings.push({
          category: "internal-consistency",
          severity: "blocking",
          message: `Character "${charId}" referenced in scene metadata but not defined in Bible.`,
          location: scene.id,
        });
        continue;
      }
      passed++;
    }

    // ── Check 1b: Location existence in Bible ───────────────────────────
    for (const locId of scene.metadata.locations) {
      total++;
      if (!bible.locations.has(locId)) {
        findings.push({
          category: "internal-consistency",
          severity: "blocking",
          message: `Location "${locId}" referenced in scene metadata but not defined in Bible.`,
          location: scene.id,
        });
        continue;
      }
      passed++;
    }

    // ── Check 2a: Character mention in prose ────────────────────────────
    for (const charId of scene.metadata.characters) {
      const charState = bible.characters.get(charId);
      if (!charState) continue; // already flagged in Check 1a

      total++;
      const names = [charState.name, ...charState.aliases].filter((n) => n.length > 0);
      if (names.some((name) => lowerProse.includes(name.toLowerCase()))) {
        passed++;
      } else {
        findings.push({
          category: "source-alignment",
          severity: "warning",
          message: `Character "${charState.name}" not mentioned in scene prose by name or alias.`,
          location: scene.id,
        });
      }
    }

    // ── Check 2b: Location mention in prose ─────────────────────────────
    for (const locId of scene.metadata.locations) {
      const locState = bible.locations.get(locId);
      if (!locState) continue; // already flagged in Check 1b

      total++;
      const names = [locState.name, ...locState.aliases].filter((n) => n.length > 0);
      if (names.some((name) => lowerProse.includes(name.toLowerCase()))) {
        passed++;
      } else {
        findings.push({
          category: "source-alignment",
          severity: "warning",
          message: `Location "${locState.name}" not mentioned in scene prose by name or alias.`,
          location: scene.id,
        });
      }
    }

    // ── Score ───────────────────────────────────────────────────────────
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;
    const verdict: EvaluationVerdict = score >= 80 ? "pass" : score >= 50 ? "conditional" : "reject";

    return {
      evaluatorId: "fact-checker",
      role: "fact-checker",
      score,
      verdict,
      findings,
      iterationCount: context.iterationCount,
    };
  };
}

export const factChecker = createFactChecker();

/** @deprecated Use `factChecker` instead. */
export const factCheckerStub = factChecker;
