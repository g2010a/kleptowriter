import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { EvaluationVerdict } from "../../../types/scene.js";
import type { EvaluationFinding } from "../../../eval/reports.js";

export interface EditorEvaluation {
  evaluatorId: string;
  role: "editor";
  score: number;
  verdict: EvaluationVerdict;
  findings: EvaluationFinding[];
  iterationCount: number;
}

export type EditorEvaluator = (
  scene: SceneDocument,
  bible: StoryBible,
  context: EditorContext,
) => EditorEvaluation;

export interface EditorContext {
  editPasses: string[];
  styleGuide: string[];
  iterationCount: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Create a real editor evaluator with prose quality and dialogue naturalism checks. */
export function createEditorEvaluator(): EditorEvaluator {
  return (scene: SceneDocument, _bible: StoryBible, context: EditorContext): EditorEvaluation => {
    const findings: EvaluationFinding[] = [];

    const proseQuality = assessProseQuality(scene.prose);
    findings.push(...proseQuality.findings);

    const dialogueQuality = assessDialogueNaturalism(scene.prose);
    findings.push(...dialogueQuality.findings);

    const score = Math.round(proseQuality.score * 0.5 + dialogueQuality.score * 0.5);
    const verdict: EvaluationVerdict = score >= 80 ? "pass" : score >= 50 ? "conditional" : "reject";

    return {
      evaluatorId: "editor",
      role: "editor",
      score,
      verdict,
      findings,
      iterationCount: context.iterationCount,
    };
  };
}

// Backward-compatible default instance
export const editorStub = createEditorEvaluator();

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface DimensionAssessment {
  score: number;
  findings: EvaluationFinding[];
}

/**
 * Prose quality dimension:
 *  1. Sentence length variety (std dev of sentence word-counts)
 *  2. Passive voice frequency (heuristic: is/are/was/were/been/being + -ed word)
 *  3. Overused filler words (very, really, quite, suddenly, just, literally, actually)
 */
function assessProseQuality(prose: string): DimensionAssessment {
  const findings: EvaluationFinding[] = [];

  if (!prose.trim()) {
    findings.push({ category: "prose-quality", severity: "blocking", message: "No prose content to evaluate." });
    return { score: 0, findings };
  }

  const sentences = prose.split(/[.!?]+/g).map(s => s.trim()).filter(s => s.length > 0);
  const words = prose.match(/[\p{L}\p{N}'-]+/gu) ?? [];

  if (sentences.length < 2) {
    findings.push({ category: "prose-quality", severity: "info", message: "Too few sentences for meaningful prose quality analysis." });
    return { score: 50, findings };
  }

  const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);

  // ── Metric 1: Sentence length variety ──────────────────────────────────────
  const avgLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((sum, len) => sum + (len - avgLen) ** 2, 0) / sentenceLengths.length;
  const stdDev = Math.sqrt(variance);
  const shortCount = sentenceLengths.filter(l => l <= 5).length;
  const longCount = sentenceLengths.filter(l => l >= 20).length;

  let varietyScore: number;
  if (stdDev < 3) {
    varietyScore = 30;
    findings.push({
      category: "prose-quality",
      severity: "warning",
      message: `Low sentence length variety (σ=${stdDev.toFixed(1)}). Mix short and long sentences to improve rhythm.`,
    });
  } else if (stdDev < 6) {
    varietyScore = 70;
  } else {
    varietyScore = 100;
    findings.push({
      category: "prose-quality",
      severity: "info",
      message: `Good sentence length variety (σ=${stdDev.toFixed(1)}, ${shortCount} short, ${longCount} long sentences).`,
    });
  }

  // ── Metric 2: Passive voice ────────────────────────────────────────────────
  // ponytail: heuristic only — catches is/was/were + -ed forms, misses irregular participles
  const passivePattern = /\b(?:is|are|was|were|been|being)\s+(\w+ed)\b/gi;
  const passiveMatches = [...prose.matchAll(passivePattern)];
  const passivePerSentence = passiveMatches.length / sentences.length;

  let passiveScore: number;
  if (passivePerSentence > 0.4) {
    passiveScore = 30;
    findings.push({
      category: "prose-quality",
      severity: "warning",
      message: `High passive voice usage (${passiveMatches.length} instances, ~${passivePerSentence.toFixed(1)}/sentence). Prefer active voice for stronger prose.`,
    });
  } else if (passivePerSentence > 0.15) {
    passiveScore = 70;
  } else {
    passiveScore = 100;
  }

  // ── Metric 3: Filler / overused words ─────────────────────────────────────
  const fillerWords = ["very", "really", "quite", "suddenly", "just", "literally", "actually"];
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    const lower = w.toLowerCase();
    wordFreq.set(lower, (wordFreq.get(lower) ?? 0) + 1);
  }

  const flaggedFillers = fillerWords
    .map(fw => ({ word: fw, count: wordFreq.get(fw) ?? 0 }))
    .filter(({ count }) => count > 2);

  let fillerScore: number;
  if (flaggedFillers.length > 2) {
    fillerScore = 30;
    findings.push({
      category: "prose-quality",
      severity: "warning",
      message: `Overused filler words: ${flaggedFillers.map(f => `${f.word} (${f.count}x)`).join(", ")}. Consider reducing them.`,
    });
  } else if (flaggedFillers.length > 0) {
    fillerScore = 70;
  } else {
    fillerScore = 100;
  }

  const score = Math.round(varietyScore * 0.35 + passiveScore * 0.35 + fillerScore * 0.3);
  return { score, findings };
}

/**
 * Dialogue naturalism dimension:
 *  1. Dialogue tag variety (said/asked vs. descriptive tags / action beats)
 *  2. Exposition-in-dialogue (characters telling each other what they already know)
 *  3. Speech length balance (overly long uninterrupted blocks)
 */
function assessDialogueNaturalism(prose: string): DimensionAssessment {
  const findings: EvaluationFinding[] = [];

  if (!prose.trim()) {
    findings.push({ category: "dialogue-naturalism", severity: "info", message: "No prose to evaluate for dialogue." });
    return { score: 50, findings };
  }

  // Extract dialogue blocks (text between standard or curly double quotes)
  const dialogueBlocks: string[] = [];
  const quotePattern = /[""]([^""]+)[""]/g;
  let match: RegExpExecArray | null;
  while ((match = quotePattern.exec(prose)) !== null) {
    dialogueBlocks.push(match[1]!);
  }

  if (dialogueBlocks.length === 0) {
    findings.push({
      category: "dialogue-naturalism",
      severity: "info",
      message: "No dialogue found. Score set to neutral.",
    });
    return { score: 50, findings };
  }

  const lowerProse = prose.toLowerCase();

  // ── Metric 1: Dialogue tag variety ─────────────────────────────────────────
  const basicTags = ["said", "asked", "replied", "answered"];
  const variedTags = [
    "whispered", "shouted", "murmured", "exclaimed", "called",
    "began", "continued", "offered", "suggested", "agreed",
    "countered", "snapped", "drawled", "breathed", "hissed",
  ];

  const countTag = (tag: string) => (lowerProse.match(new RegExp(`\\b${tag}\\b`, "g")) ?? []).length;

  const basicCount = basicTags.reduce((sum, t) => sum + countTag(t), 0);
  const variedCount = variedTags.reduce((sum, t) => sum + countTag(t), 0);
  const totalTags = basicCount + variedCount;

  let tagScore: number;
  if (totalTags === 0) {
    tagScore = 40;
    findings.push({
      category: "dialogue-naturalism",
      severity: "warning",
      message: "No dialogue tags found. Add speech attributions or action beats for reader clarity.",
    });
  } else {
    const varietyRatio = variedCount / totalTags;
    if (varietyRatio < 0.15) {
      tagScore = 35;
      findings.push({
        category: "dialogue-naturalism",
        severity: "warning",
        message: `Dialogue tags lack variety: ${basicCount} basic (said/asked) vs ${variedCount} varied. Mix in descriptive tags or action beats.`,
      });
    } else if (varietyRatio < 0.35) {
      tagScore = 70;
    } else {
      tagScore = 100;
      findings.push({
        category: "dialogue-naturalism",
        severity: "info",
        message: `Good dialogue tag variety (${variedCount} varied / ${totalTags} total).`,
      });
    }
  }

  // ── Metric 2: Exposition-in-dialogue ───────────────────────────────────────
  const expositionPatterns = [
    /\bas you know\b/i,
    /\byou know that\b/i,
    /\bas you remember\b/i,
    /\bas we discussed\b/i,
    /\byou recall\b/i,
    /\bif you recall\b/i,
    /\bas I told you\b/i,
    /\bas mentioned\b/i,
    /\byou already know\b/i,
  ];

  const expositionHits = expositionPatterns.filter(p => p.test(prose));
  let expositionScore: number;
  if (expositionHits.length > 2) {
    expositionScore = 25;
    findings.push({
      category: "dialogue-naturalism",
      severity: "warning",
      message: `Excessive exposition-in-dialogue (${expositionHits.length} patterns). Characters telling each other what they already know.`,
    });
  } else if (expositionHits.length > 0) {
    expositionScore = 65;
    findings.push({
      category: "dialogue-naturalism",
      severity: "info",
      message: `Some exposition-in-dialogue patterns (${expositionHits.length}: ${expositionHits.map(p => p.source).join(", ")}).`,
    });
  } else {
    expositionScore = 100;
  }

  // ── Metric 3: Speech length balance ────────────────────────────────────────
  const longSpeechCount = dialogueBlocks.filter(d => {
    const wc = d.split(/\s+/).filter(Boolean).length;
    return wc > 50;
  }).length;
  const longRatio = longSpeechCount / dialogueBlocks.length;

  let lengthScore: number;
  if (longRatio > 0.3) {
    lengthScore = 40;
    findings.push({
      category: "dialogue-naturalism",
      severity: "warning",
      message: `${longSpeechCount}/${dialogueBlocks.length} dialogue blocks exceed 50 words. Break up long speeches for natural pacing.`,
    });
  } else {
    lengthScore = 100;
  }

  const score = Math.round(tagScore * 0.4 + expositionScore * 0.35 + lengthScore * 0.25);
  return { score, findings };
}
