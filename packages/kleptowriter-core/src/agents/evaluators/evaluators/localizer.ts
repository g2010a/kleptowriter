import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { EvaluationVerdict } from "../../../types/scene.js";

export interface LocalizerEvaluation {
  evaluatorId: string;
  role: "localizer";
  score: number;
  verdict: EvaluationVerdict;
  findings: string[];
  iterationCount: number;
}

export type LocalizerEvaluator = (
  scene: SceneDocument,
  bible: StoryBible,
  context: LocalizerContext,
) => LocalizerEvaluation;

export interface LocalizerContext {
  targetLocale: string;
  culturalMarkers: string[];
  idioms: string[];
  iterationCount: number;
}

// ponytail: simple word-boundary stoplist, fine for this scale
const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "have", "been",
  "were", "their", "there", "which", "what", "when", "where",
  "about", "into", "over", "after", "before", "could", "would",
  "should", "these", "those", "while", "because",
]);

function extractKeyTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;:.!?()"“”‘’\-—]+/u)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
}

function mentionsName(text: string, name: string, aliases: string[]): boolean {
  return [name, ...aliases].some((candidate) => candidate.length > 0 && text.includes(candidate.toLowerCase()));
}

function parseDialogue(prose: string): string[] {
  return prose.match(/[“"][^”"]*[”"]/gu) ?? [];
}

function evaluateGeographicAccuracy(scene: SceneDocument, bible: StoryBible, lowerProse: string): Array<[boolean, string]> {
  const checks: Array<[boolean, string]> = [];
  const locations = scene.metadata.locations ?? [];

  for (const locId of locations) {
    const loc = bible.locations.get(locId);
    if (!loc) {
      checks.push([false, `Location "${locId}" referenced in metadata but not defined in bible`]);
      continue;
    }

    // Check location name is mentioned in prose
    const nameMentioned = mentionsName(lowerProse, loc.name, loc.aliases);
    checks.push([nameMentioned, `Location "${loc.name}" is ${nameMentioned ? "" : "not "}mentioned in the scene prose`]);

    // Check related locations
    for (const relatedId of loc.relatedLocations) {
      const relatedLoc = bible.locations.get(relatedId);
      if (relatedLoc) {
        const relatedMentioned = mentionsName(lowerProse, relatedLoc.name, relatedLoc.aliases);
        if (relatedMentioned) {
          checks.push([true, `Related location "${relatedLoc.name}" is referenced near "${loc.name}"`]);
        }
      }
    }

    // Check description key terms appear in prose
    if (loc.description) {
      const keyTerms = extractKeyTerms(loc.description);
      const matches = keyTerms.filter((t) => lowerProse.includes(t));
      if (keyTerms.length >= 3) {
        const ratio = matches.length / keyTerms.length;
        checks.push([
          ratio >= 0.15,
          `Geographic description of "${loc.name}" is ${ratio >= 0.15 ? "reflected" : "not well reflected"} in scene prose (${matches.length}/${keyTerms.length} key terms)`,
        ]);
      }
    }
  }

  return checks;
}

function evaluateCulturalAuthenticity(
  scene: SceneDocument,
  context: LocalizerContext,
  lowerProse: string,
): Array<[boolean, string]> {
  const checks: Array<[boolean, string]> = [];
  const dialogueText = parseDialogue(scene.prose).join(" ").toLowerCase();

  // Check cultural markers
  if (context.culturalMarkers.length > 0) {
    const cultureHits = context.culturalMarkers.filter((m) => lowerProse.includes(m.toLowerCase()));
    const cultureRatio = cultureHits.length / context.culturalMarkers.length;
    checks.push([
      cultureRatio >= 0.3,
      `Cultural authenticity: ${cultureHits.length}/${context.culturalMarkers.length} cultural markers present in scene`,
    ]);
  }

  // Check idioms in prose or dialogue
  if (context.idioms.length > 0) {
    const idiomHits = context.idioms.filter((i) => {
      const iLower = i.toLowerCase();
      return lowerProse.includes(iLower) || dialogueText.includes(iLower);
    });
    const idiomRatio = idiomHits.length / context.idioms.length;
    checks.push([
      idiomRatio >= 0.2,
      `Idiom authenticity: ${idiomHits.length}/${context.idioms.length} idioms appear in scene`,
    ]);
  }

  return checks;
}

export function createLocalizerEvaluator(): LocalizerEvaluator {
  return (scene: SceneDocument, bible: StoryBible, context: LocalizerContext): LocalizerEvaluation => {
    const lowerProse = scene.prose.toLowerCase();

    const geoChecks = evaluateGeographicAccuracy(scene, bible, lowerProse);
    const cultureChecks = evaluateCulturalAuthenticity(scene, context, lowerProse);
    const allChecks = [...geoChecks, ...cultureChecks];

    const passed = allChecks.filter(([ok]) => ok);
    const score = allChecks.length > 0 ? Math.round((passed.length / allChecks.length) * 100) : 100;

    return {
      evaluatorId: "localizer",
      role: "localizer",
      score,
      verdict: score >= 80 ? "pass" : score >= 50 ? "conditional" : "reject",
      findings: allChecks.map(([ok, msg]) => `${ok ? "PASS" : "FAIL"}: ${msg}`),
      iterationCount: context.iterationCount,
    };
  };
}
