import type { StoryBible } from "../../data-model/bible/index.js";
import type { SceneDocument } from "../../data-model/scene/index.js";
import { AgentRole, type EvaluationReport, type EvaluationVerdict, type GateResult } from "../../types/index.js";

export interface ProseEvaluation {
  evaluatorId: string;
  role: string;
  score: number;
  verdict: EvaluationVerdict;
  findings: string[];
  iterationCount: number;
}

type Evaluator = (scene: SceneDocument, bible: StoryBible, context: ProseContext) => ProseEvaluation;

interface ProseContext {
  words: string[];
  sentences: string[];
  paragraphs: string[];
  lowerProse: string;
  iterationCount: number;
}

const roleMap: Record<string, AgentRole> = {
  narratologist: AgentRole.Narratologist,
  "pacing-analyst": AgentRole.PacingAnalyst,
  "character-consistency": AgentRole.CharacterConsistency,
  "thematic-coherence": AgentRole.ThematicCoherence,
  worldbuilding: AgentRole.Worldbuilding,
  dialogist: AgentRole.Dialogist,
  stylesheet: AgentRole.Stylesheet,
  "mood-tension-curator": AgentRole.MoodTensionCurator,
};

export class SceneProseGate {
  private readonly maxRevisionCount = 5;
  private readonly evaluatorRoles = [
    "narratologist",
    "pacing-analyst",
    "character-consistency",
    "thematic-coherence",
    "worldbuilding",
    "dialogist",
    "stylesheet",
    "mood-tension-curator",
  ];

  evaluate(scene: SceneDocument, bible: StoryBible, iterationCount = 0): GateResult {
    const context = this.getContext(scene.prose, iterationCount);
    const evaluations = this.evaluatorRoles.map((role) => this.evaluators[role]?.(scene, bible, context) ?? this.pass(role, iterationCount));
    const score = Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length);
    const hardReject = evaluations.some((evaluation) => evaluation.verdict === "reject");
    const conditional = evaluations.some((evaluation) => evaluation.verdict === "conditional");
    const verdict: EvaluationVerdict = hardReject || score < 60 ? "reject" : conditional || score < 80 ? "conditional" : "pass";

    return {
      verdict: this.isEscalated(iterationCount) && verdict !== "pass" ? "reject" : verdict,
      score,
      evaluatorReports: evaluations.map((evaluation) => this.toReport(evaluation)),
      message: this.getMessage(verdict, iterationCount),
    };
  }

  getRemainingRevisions(iterationCount: number): number {
    return Math.max(0, this.maxRevisionCount - iterationCount);
  }

  isEscalated(iterationCount: number): boolean {
    return iterationCount >= this.maxRevisionCount;
  }

  private readonly evaluators: Record<string, Evaluator> = {
    narratologist: (scene, _bible, context) =>
      this.evaluateChecks("narratologist", context.iterationCount, [
        [context.words.length >= 120, "Scene prose is long enough to carry a narrative beat."],
        [context.paragraphs.length >= 3, "Scene has setup, development, and turn/resolution paragraphs."],
        [hasAny(context.lowerProse, ["but", "however", "until", "because", "therefore", "realized"]), "Scene signals cause, conflict, or change."],
        [scene.metadata.plotThreads.length + scene.metadata.dramaticQuestions.length > 0, "Scene is attached to a plot thread or dramatic question."],
      ]),

    "pacing-analyst": (_scene, _bible, context) => {
      const averageSentenceLength = context.words.length / Math.max(1, context.sentences.length);
      return this.evaluateChecks("pacing-analyst", context.iterationCount, [
        [averageSentenceLength >= 7 && averageSentenceLength <= 28, "Sentence length supports readable pacing."],
        [countMatches(context.lowerProse, /\b(turned|ran|stepped|opened|looked|asked|said|moved|reached|took)\b/g) >= 4, "Action/dialogue beats keep the scene moving."],
        [countMatches(context.lowerProse, /\b(saw|heard|smelled|felt|cold|warm|bright|dark|quiet|rough)\b/g) >= 3, "Description anchors the prose."],
      ]);
    },

    "character-consistency": (scene, bible, context) => {
      const missing = scene.metadata.characters.filter((id) => !mentionsEntity(context.lowerProse, bible.characters.get(id)?.name ?? id, bible.characters.get(id)?.aliases ?? []));
      return this.evaluateChecks("character-consistency", context.iterationCount, [
        [scene.metadata.characters.length > 0, "Scene metadata names participating characters."],
        [missing.length === 0, missing.length === 0 ? "All metadata characters appear in prose." : `Missing character mentions: ${missing.join(", ")}.`],
        [!scene.metadata.pov || mentionsEntity(context.lowerProse, bible.characters.get(scene.metadata.pov)?.name ?? scene.metadata.pov, bible.characters.get(scene.metadata.pov)?.aliases ?? []), "POV character is present in prose."],
      ]);
    },

    "thematic-coherence": (scene, bible, context) => {
      const knownThemes = [...bible.thematicProgression.themes.keys()];
      const motifs = scene.metadata.thematicMotifs;
      return this.evaluateChecks("thematic-coherence", context.iterationCount, [
        [motifs.length > 0 || knownThemes.length === 0, "Scene declares thematic motifs or no active bible themes exist."],
        [[...motifs, ...knownThemes].some((theme) => context.lowerProse.includes(theme.toLowerCase())), "Prose echoes at least one theme or motif."],
      ]);
    },

    worldbuilding: (scene, bible, context) => {
      const missing = scene.metadata.locations.filter((id) => !mentionsEntity(context.lowerProse, bible.locations.get(id)?.name ?? id, bible.locations.get(id)?.aliases ?? []));
      return this.evaluateChecks("worldbuilding", context.iterationCount, [
        [scene.metadata.locations.length > 0, "Scene metadata names a location."],
        [missing.length === 0, missing.length === 0 ? "All metadata locations appear in prose." : `Missing location mentions: ${missing.join(", ")}.`],
        [countMatches(context.lowerProse, /\b(room|street|door|window|air|light|shadow|floor|wall|table|sky|rain|wind)\b/g) >= 2, "Physical setting details are present."],
      ]);
    },

    dialogist: (_scene, _bible, context) =>
      this.evaluateChecks("dialogist", context.iterationCount, [
        [countMatches(context.lowerProse, /[“"]/g) >= 4 || countMatches(context.lowerProse, /\b(said|asked|whispered|replied)\b/g) >= 2, "Dialogue or speech tags are present."],
        [hasAny(context.lowerProse, ["asked", "said", "replied", "whispered"]), "Speech attribution is readable."],
      ]),

    stylesheet: (_scene, _bible, context) =>
      this.evaluateChecks("stylesheet", context.iterationCount, [
        [context.sentences.length >= 5, "Scene has enough sentence variety to evaluate style."],
        [countMatches(context.lowerProse, /\b(very|really|suddenly)\b/g) <= 4, "Filler adverbs are controlled."],
        [countMatches(context.lowerProse, /!!!|\.\.\.|\?\?/g) === 0, "Punctuation is not overworked."],
      ]),

    "mood-tension-curator": (scene, _bible, context) =>
      this.evaluateChecks("mood-tension-curator", context.iterationCount, [
        [scene.metadata.mood ? context.lowerProse.includes(scene.metadata.mood.toLowerCase()) || hasAny(context.lowerProse, moodWords(scene.metadata.mood)) : true, "Prose supports the declared mood."],
        [scene.metadata.tension === undefined || scene.metadata.tension <= 3 || hasAny(context.lowerProse, ["threat", "fear", "risk", "danger", "urgent", "knife", "blood", "deadline", "trap"]), "High-tension scenes include pressure cues."],
      ]),
  };

  private evaluateChecks(role: string, iterationCount: number, checks: Array<[boolean, string]>): ProseEvaluation {
    const passed = checks.filter(([ok]) => ok);
    const score = Math.round((passed.length / checks.length) * 100);
    return {
      evaluatorId: `prose-${role}`,
      role,
      score,
      verdict: score >= 80 ? "pass" : score >= 50 ? "conditional" : "reject",
      findings: checks.map(([ok, finding]) => `${ok ? "PASS" : "FAIL"}: ${finding}`),
      iterationCount,
    };
  }

  private pass(role: string, iterationCount: number): ProseEvaluation {
    return { evaluatorId: `prose-${role}`, role, score: 100, verdict: "pass", findings: ["PASS: Evaluator not configured."], iterationCount };
  }

  private toReport(evaluation: ProseEvaluation): EvaluationReport {
    return {
      agentId: evaluation.evaluatorId,
      agentRole: roleMap[evaluation.role] ?? AgentRole.Critic,
      verdict: evaluation.verdict,
      confidence: evaluation.score / 100,
      findings: [...evaluation.findings, `iterationCount: ${evaluation.iterationCount}`],
      timestamp: new Date(),
    };
  }

  private getContext(prose: string, iterationCount: number): ProseContext {
    const paragraphs = prose.split(/\n\s*\n/g).map((paragraph) => paragraph.trim()).filter(Boolean);
    const sentences = prose.split(/[.!?]+/g).map((sentence) => sentence.trim()).filter(Boolean);
    return {
      words: prose.match(/[\p{L}\p{N}'-]+/gu) ?? [],
      sentences,
      paragraphs,
      lowerProse: prose.toLowerCase(),
      iterationCount,
    };
  }

  private getMessage(verdict: EvaluationVerdict, iterationCount: number): string {
    const remaining = this.getRemainingRevisions(iterationCount);
    if (this.isEscalated(iterationCount) && verdict !== "pass") return "Scene prose rejected after maximum revision attempts.";
    return `Scene prose ${verdict}; ${remaining} revision${remaining === 1 ? "" : "s"} remaining.`;
  }
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function mentionsEntity(text: string, name: string, aliases: string[]): boolean {
  return [name, ...aliases].some((candidate) => candidate.length > 0 && text.includes(candidate.toLowerCase()));
}

function moodWords(mood: string): string[] {
  const normalized = mood.toLowerCase();
  if (normalized.includes("myster")) return ["secret", "shadow", "unknown", "whisper", "hidden"];
  if (normalized.includes("tense")) return ["threat", "risk", "danger", "urgent"];
  if (normalized.includes("sad")) return ["grief", "loss", "quiet", "empty"];
  return [normalized];
}
