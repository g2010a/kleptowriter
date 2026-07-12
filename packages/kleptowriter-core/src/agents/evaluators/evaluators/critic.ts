import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { EvaluationVerdict } from "../../../types/scene.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CriticFinding {
  category: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface CriticEvaluation {
  evaluatorId: string;
  role: "critic";
  score: number;
  verdict: EvaluationVerdict;
  findings: CriticFinding[];
  iterationCount: number;
}

export type CriticEvaluator = (
  scene: SceneDocument,
  bible: StoryBible,
  context: CriticContext,
) => CriticEvaluation;

export interface CriticContext {
  critiqueAreas: string[];
  severityThreshold: number;
  iterationCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

function extractDialogue(text: string): string[] {
  return text.match(/"([^"]*)"/g) ?? [];
}

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

function determineVerdict(score: number): EvaluationVerdict {
  if (score >= 0.7) return "pass";
  if (score >= 0.4) return "conditional";
  return "reject";
}

// ─── Pacing Analysis ──────────────────────────────────────────────────────────

interface PacingResult {
  subScore: number;
  findings: CriticFinding[];
}

function analyzePacing(prose: string): PacingResult {
  const findings: CriticFinding[] = [];

  const wordCount = countWords(prose);
  if (wordCount === 0) {
    findings.push({
      category: "pacing",
      severity: "critical",
      message: "Scene has no prose content to evaluate",
    });
    return { subScore: 0, findings };
  }

  const sentenceCount = countSentences(prose);
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  const dialogueText = extractDialogue(prose).join(" ");
  const dialogueWords = countWords(dialogueText);
  const dialoguePct = (dialogueWords / wordCount) * 100;

  const paraCount = countParagraphs(prose);
  const avgParaLength = paraCount > 0 ? wordCount / paraCount : wordCount;

  let score = 1.0;

  // ── Sentence length ──
  if (avgSentenceLength > 30) {
    score -= 0.25;
    findings.push({
      category: "pacing",
      severity: "warning",
      message: `Average sentence length of ${avgSentenceLength.toFixed(1)} words is very long, which slows pacing and reduces readability`,
    });
  } else if (avgSentenceLength > 22) {
    score -= 0.1;
    findings.push({
      category: "pacing",
      severity: "info",
      message: `Average sentence length of ${avgSentenceLength.toFixed(1)} words is moderately long`,
    });
  } else if (avgSentenceLength < 10 && wordCount > 100) {
    score -= 0.1;
    findings.push({
      category: "pacing",
      severity: "info",
      message: `Average sentence length of ${avgSentenceLength.toFixed(1)} words is very short, creating a rapid staccato rhythm`,
    });
  }

  // ── Dialogue / narrative balance ──
  if (dialoguePct > 65) {
    score -= 0.2;
    findings.push({
      category: "pacing",
      severity: "warning",
      message: `Dialogue accounts for ${dialoguePct.toFixed(0)}% of the scene — add narrative description for pacing variety`,
    });
  } else if (dialoguePct > 50) {
    score -= 0.1;
    findings.push({
      category: "pacing",
      severity: "info",
      message: `Dialogue accounts for ${dialoguePct.toFixed(0)}% of the scene; balance feels dialogue-heavy`,
    });
  } else if (dialoguePct < 5 && wordCount > 200) {
    score -= 0.15;
    findings.push({
      category: "pacing",
      severity: "warning",
      message: `Dialogue accounts for only ${dialoguePct.toFixed(0)}% of the scene — consider breaking up exposition with character interaction`,
    });
  }

  // ── Paragraph length ──
  if (avgParaLength > 200 && wordCount > 300) {
    score -= 0.1;
    findings.push({
      category: "pacing",
      severity: "info",
      message: `Average paragraph length of ${avgParaLength.toFixed(0)} words is high; vary paragraph lengths for rhythmic pacing`,
    });
  }

  // ── Overall scene length ──
  if (wordCount < 100) {
    score -= 0.3;
    findings.push({
      category: "pacing",
      severity: "warning",
      message: `Very short scene (${wordCount} words) may lack sufficient development for meaningful pacing`,
    });
  } else if (wordCount > 4000) {
    score -= 0.15;
    findings.push({
      category: "pacing",
      severity: "info",
      message: `Very long scene (${wordCount} words) — consider whether this could be split into multiple scenes`,
    });
  }

  return { subScore: Math.max(0, Math.min(1, score)), findings };
}

// ─── Structure Analysis ───────────────────────────────────────────────────────

interface StructureResult {
  subScore: number;
  findings: CriticFinding[];
}

function analyzeStructure(prose: string): StructureResult {
  const findings: CriticFinding[] = [];
  const wordCount = countWords(prose);

  if (wordCount === 0) {
    findings.push({
      category: "structure",
      severity: "critical",
      message: "Scene has no prose content — structural analysis impossible",
    });
    return { subScore: 0, findings };
  }

  const paraCount = countParagraphs(prose);
  const lower = prose.toLowerCase();

  // Count transition / conflict markers (setup → development)
  const transitionMatches = lower.match(
    /\b(?:but|however|then|suddenly|instead|despite|although|yet|while|as|when|because)\b/gi,
  );
  const transitionCount = transitionMatches?.length ?? 0;

  // Count resolution / closure markers
  const resolutionMatches = lower.match(
    /\b(?:finally|at last|in the end|realized|understood|accepted|decided|resolved|settled|calm(?:ly)?)\b/gi,
  );
  const resolutionCount = resolutionMatches?.length ?? 0;

  // Is there dialogue (character interaction / conflict)?
  const hasDialogue = (prose.match(/"/g) ?? []).length >= 2;

  let elementsFound = 0;
  const totalChecks = 4;

  // Check 1 — Paragraph progression (setup → conflict → resolution)
  if (paraCount >= 3) {
    elementsFound += 1;
  } else if (paraCount === 2) {
    elementsFound += 0.5;
    findings.push({
      category: "structure",
      severity: "info",
      message: "Scene has only 2 paragraphs — consider adding a resolution paragraph to complete the arc",
    });
  } else {
    findings.push({
      category: "structure",
      severity: "warning",
      message: `Scene has only ${paraCount} paragraph — lacks structural development (setup → conflict → resolution)`,
    });
    elementsFound += 0.25; // partial credit for having content
  }

  // Check 2 — Character interaction (dialogue as conflict vehicle)
  if (hasDialogue) {
    elementsFound += 1;
  } else if (wordCount > 100) {
    findings.push({
      category: "structure",
      severity: "warning",
      message: "No dialogue detected — character interaction through dialogue typically strengthens conflict development",
    });
  }

  // Check 3 — Transitions / conflict markers
  if (transitionCount >= 4) {
    elementsFound += 1;
  } else if (transitionCount >= 2) {
    elementsFound += 0.5;
    findings.push({
      category: "structure",
      severity: "info",
      message: `Only ${transitionCount} transition or conflict markers found — adding more (but, however, suddenly) can strengthen scene development`,
    });
  } else {
    findings.push({
      category: "structure",
      severity: "warning",
      message: "Fewer than 2 transition or conflict markers detected — scene may lack narrative progression",
    });
  }

  // Check 4 — Resolution / closure markers
  if (resolutionCount >= 1) {
    elementsFound += 1;
  } else {
    findings.push({
      category: "structure",
      severity: "info",
      message: "No clear resolution markers found — consider whether the scene ending provides closure",
    });
  }

  const subScore = elementsFound / totalChecks;

  if (elementsFound >= 3) {
    findings.push({
      category: "structure",
      severity: "info",
      message: "Scene demonstrates strong structural development with clear setup, conflict, and resolution elements",
    });
  }

  return { subScore: Math.max(0, Math.min(1, subScore)), findings };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createCriticEvaluator(): CriticEvaluator {
  return (scene: SceneDocument, _bible: StoryBible, context: CriticContext): CriticEvaluation => {
    const allFindings: CriticFinding[] = [];
    const areas = context.critiqueAreas;

    const checkPacing = areas.length === 0 || areas.includes("pacing");
    const checkStructure = areas.length === 0 || areas.includes("structure");

    let pacingScore = 1;
    let structureScore = 1;
    let checkedCount = 0;

    if (checkPacing) {
      checkedCount++;
      const result = analyzePacing(scene.prose);
      pacingScore = result.subScore;
      allFindings.push(...result.findings);
    }

    if (checkStructure) {
      checkedCount++;
      const result = analyzeStructure(scene.prose);
      structureScore = result.subScore;
      allFindings.push(...result.findings);
    }

    const overallScore = checkedCount > 0
      ? (pacingScore + structureScore) / checkedCount
      : 0;

    return {
      evaluatorId: "critic-evaluator",
      role: "critic",
      score: Math.round(overallScore * 100) / 100,
      verdict: determineVerdict(overallScore),
      findings: allFindings,
      iterationCount: context.iterationCount,
    };
  };
}

export const criticEvaluator = createCriticEvaluator();
