import type { StoryBible } from "../../data-model/bible/interfaces.js";
import type { ScenePlan } from "../../narrative/types.js";
import type { NarrativeStructure, TemplateTensionConstraint } from "../../narrative/templates/types.js";
import { AgentRole } from "../../types/enums.js";
import type { EvaluationReport, EvaluationVerdict, GateResult } from "../../types/scene.js";

export interface EvaluatorVote {
  evaluatorId: string;
  role: string;
  score: number;
  verdict: EvaluationVerdict;
  comments: string[];
  weight: number;
}

export class ScenePlanGate {
  private readonly evaluatorWeights: Record<string, number> = {
    narratologist: 3,
    pacing: 2,
    character: 3,
    thematic: 2,
    worldbuilding: 1,
    mood: 1,
    "fact-checker": 2,
    localizer: 1,
    "narrative-consistency": 2,
    critic: 2,
    editor: 1,
  };

  evaluate(plan: ScenePlan, bible: StoryBible, structure?: NarrativeStructure): GateResult {
    const votes = [
      this.rateNarratologist(plan),
      this.ratePacing(plan, structure),
      this.rateCharacterConsistency(plan, bible),
      this.rateThematicCoherence(plan, bible),
      this.rateWorldbuilding(plan, bible),
      this.rateMoodTension(plan),
      this.rateFactChecker(plan, bible),
      this.rateLocalizer(plan, bible),
      this.rateNarrativeConsistency(plan, bible),
      this.rateCritic(plan, structure),
      this.rateEditor(plan),
    ];

    const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
    const score = votes.reduce((sum, vote) => sum + vote.score * vote.weight, 0) / totalWeight;
    const verdict = verdictForScore(score);
    const blocking = votes.filter((vote) => vote.verdict === "reject").map((vote) => vote.role);

    return {
      verdict,
      score: roundScore(score),
      evaluatorReports: votes.map(toEvaluationReport),
      alternatives: verdict === "reject" ? plan.alternatives : undefined,
      message:
        verdict === "pass"
          ? "Scene plan passes weighted evaluation."
          : verdict === "conditional"
            ? "Scene plan has minor issues: " + summarize(votes)
            : "Scene plan rejected" + (blocking.length ? ` by ${blocking.join(", ")}.` : "."),
    };
  }

  private rateNarratologist(plan: ScenePlan): EvaluatorVote {
    const comments: string[] = [];
    let score = 10;

    if (!plan.beatId.trim()) {
      score -= 4;
      comments.push("Missing beat id.");
    }

    if (!plan.purpose.trim()) {
      score -= 4;
      comments.push("Missing scene purpose.");
    }

    if (plan.dramaticQuestions.length === 0) {
      score -= 1;
      comments.push("No dramatic question attached.");
    }

    if (plan.plotThreads.length === 0) {
      score -= 1;
      comments.push("No plot thread attached.");
    }

    return this.vote("narratologist", "Narratologist", score, comments);
  }

  private ratePacing(plan: ScenePlan, structure?: NarrativeStructure): EvaluatorVote {
    const comments: string[] = [];
    let score = 8;

    if (plan.targetTension === undefined) {
      score -= 3;
      comments.push("No target tension set.");
    } else if (!inRange(plan.targetTension, 0, 10)) {
      score -= 6;
      comments.push("Target tension must be between 0 and 10.");
    }

    const beat = structure?.beats.find((candidate) => candidate.id === plan.beatId);
    if (structure && !beat) {
      score -= 3;
      comments.push("Beat id is not present in the narrative structure.");
    }

    const tensionConstraint = structure?.constraints.find(
      (constraint): constraint is TemplateTensionConstraint =>
        constraint.type === "tension" && constraint.beatId === plan.beatId,
    );

    if (tensionConstraint && plan.targetTension !== undefined) {
      const min = tensionConstraint.minTension ?? tensionConstraint.targetTension ?? 0;
      const max = tensionConstraint.maxTension ?? tensionConstraint.targetTension ?? 10;

      if (!inRange(plan.targetTension, min, max)) {
        score -= tensionConstraint.severity === "blocking" ? 5 : 2;
        comments.push("Target tension misses the structure constraint.");
      }
    }

    return this.vote("pacing", "Pacing", score, comments);
  }

  private rateCharacterConsistency(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];
    let score = 10;
    const knownCharacters = new Set(bible.characters.keys());
    const unknownCharacters = plan.suggestedCharacters.filter((characterId) => !knownCharacters.has(characterId));

    if (plan.suggestedCharacters.length === 0) {
      score -= 4;
      comments.push("No suggested characters.");
    }

    if (unknownCharacters.length > 0) {
      score -= Math.min(6, unknownCharacters.length * 3);
      comments.push(`Unknown characters: ${unknownCharacters.join(", ")}.`);
    }

    if (plan.suggestedPov && !knownCharacters.has(plan.suggestedPov)) {
      score -= 3;
      comments.push("Suggested POV is not in the story bible.");
    }

    return this.vote("character", "Character", score, comments);
  }

  private rateThematicCoherence(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];
    let score = 8;
    const knownThemes = new Set(bible.thematicProgression.themes.keys());

    if (plan.thematicMotifs.length === 0) {
      score -= 4;
      comments.push("No thematic motif attached.");
    }

    const unknownThemes = plan.thematicMotifs.filter((theme) => knownThemes.size > 0 && !knownThemes.has(theme));
    if (unknownThemes.length > 0) {
      score -= Math.min(4, unknownThemes.length * 2);
      comments.push(`Motifs not tracked in bible: ${unknownThemes.join(", ")}.`);
    }

    return this.vote("thematic", "Thematic", score, comments);
  }

  private rateWorldbuilding(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];

    if (bible.locations.size === 0 && bible.items.size === 0) {
      return this.vote("worldbuilding", "World", 8, comments);
    }

    const searchable = plan.purpose.toLowerCase();
    const mentionsKnownLocation = [...bible.locations.values()].some((location) =>
      [location.name, ...location.aliases].some((name) => searchable.includes(name.toLowerCase())),
    );
    const mentionsKnownItem = [...bible.items.values()].some((item) =>
      [item.name, ...item.aliases].some((name) => searchable.includes(name.toLowerCase())),
    );

    if (mentionsKnownLocation || mentionsKnownItem) {
      return this.vote("worldbuilding", "World", 10, comments);
    }

    comments.push("No explicit known location or item reference.");
    return this.vote("worldbuilding", "World", 7, comments);
  }

  private rateMoodTension(plan: ScenePlan): EvaluatorVote {
    const comments: string[] = [];
    let score = 8;

    if (plan.targetTension === undefined) {
      score -= 3;
      comments.push("Mood target lacks a tension value.");
    } else if (!inRange(plan.targetTension, 0, 10)) {
      score -= 6;
      comments.push("Mood target tension is outside 0-10.");
    }

    if (plan.dramaticQuestions.length === 0 && (plan.targetTension ?? 0) >= 6) {
      score -= 2;
      comments.push("High tension needs a dramatic question.");
    }

    return this.vote("mood", "Mood", score, comments);
  }

  private rateFactChecker(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];
    let score = 10;

    const unknownChars = plan.suggestedCharacters.filter((id) => !bible.characters.has(id));
    if (unknownChars.length > 0) {
      score -= Math.min(5, unknownChars.length * 2);
      comments.push(`Characters not in bible: ${unknownChars.join(", ")}.`);
    }

    const unknownThreads = plan.plotThreads.filter((id) => !bible.plotThreads.has(id));
    if (unknownThreads.length > 0) {
      score -= Math.min(4, unknownThreads.length * 2);
      comments.push(`Plot threads not in bible: ${unknownThreads.join(", ")}.`);
    }

    if (plan.suggestedCharacters.length === 0 && plan.plotThreads.length === 0) {
      score -= 3;
      comments.push("Plan references no characters or plot threads to fact-check.");
    }

    return this.vote("fact-checker", "FactChecker", score, comments);
  }

  private rateLocalizer(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];

    if (bible.locations.size === 0) {
      return this.vote("localizer", "Localizer", 10, comments);
    }

    const purposeLower = plan.purpose.toLowerCase();
    const mentionsKnownLocation = [...bible.locations.values()].some((loc) =>
      [loc.name, ...loc.aliases].some((name) => purposeLower.includes(name.toLowerCase())),
    );

    if (mentionsKnownLocation) {
      return this.vote("localizer", "Localizer", 10, comments);
    }

    // ponytail: no location mention in a bible with locations = mild concern, not blocking
    comments.push("Plan purpose does not reference a known location.");
    return this.vote("localizer", "Localizer", 7, comments);
  }

  private rateNarrativeConsistency(plan: ScenePlan, bible: StoryBible): EvaluatorVote {
    const comments: string[] = [];
    let score = 10;

    const openThreads = [...bible.plotThreads.values()].filter(
      (t) => t.status === "introduced" || t.status === "developed",
    );
    const continuedThreads = plan.plotThreads.filter((id) =>
      openThreads.some((t) => t.id === id),
    );

    if (openThreads.length > 0 && continuedThreads.length === 0) {
      score -= 4;
      comments.push(`Plan does not continue any of ${openThreads.length} open plot thread(s).`);
    }

    const resolvedThreads = plan.plotThreads.filter((id) => {
      const thread = bible.plotThreads.get(id);
      return thread?.status === "resolved" || thread?.status === "dropped";
    });
    if (resolvedThreads.length > 0) {
      score -= 3;
      comments.push(`Plan references resolved/dropped threads: ${resolvedThreads.join(", ")}.`);
    }

    return this.vote("narrative-consistency", "NarrativeConsistency", score, comments);
  }

  private rateCritic(plan: ScenePlan, structure?: NarrativeStructure): EvaluatorVote {
    const comments: string[] = [];
    let score = 8;

    if (plan.purpose.length < 20) {
      score -= 3;
      comments.push("Scene purpose is too brief to evaluate quality.");
    }

    if (plan.dramaticQuestions.length === 0) {
      score -= 2;
      comments.push("No dramatic question — reduces scene engagement.");
    }

    if (plan.alternatives && plan.alternatives.length === 0) {
      score -= 1;
      comments.push("No alternatives considered for this plan.");
    }

    const beat = structure?.beats.find((b) => b.id === plan.beatId);
    if (beat && plan.targetTension !== undefined) {
      const isHighTensionBeat = beat.type === "climax" || beat.type === "conflict";
      if (isHighTensionBeat && plan.targetTension < 5) {
        score -= 2;
        comments.push(`Beat type "${beat.type}" expects higher tension.`);
      }
    }

    return this.vote("critic", "Critic", score, comments);
  }

  private rateEditor(plan: ScenePlan): EvaluatorVote {
    const comments: string[] = [];
    let score = 8;

    if (!plan.beatId.trim()) {
      score -= 3;
      comments.push("Missing beat id — plan cannot be editorially assessed.");
    }

    if (!plan.purpose.trim()) {
      score -= 3;
      comments.push("Missing purpose — no editorial direction.");
    } else if (plan.purpose.trim().split(/\s+/).length < 5) {
      score -= 1;
      comments.push("Purpose is very short — consider expanding editorial direction.");
    }

    if (plan.suggestedPov === undefined) {
      score -= 1;
      comments.push("No POV suggested — editorial needs point of view.");
    }

    return this.vote("editor", "Editor", score, comments);
  }

  private vote(evaluatorId: string, role: string, score: number, comments: string[]): EvaluatorVote {
    const boundedScore = clamp(score, 0, 10);

    return {
      evaluatorId,
      role,
      score: boundedScore,
      verdict: verdictForScore(boundedScore),
      comments: comments.length ? comments : ["No issues found."],
      weight: this.evaluatorWeights[evaluatorId] ?? 1,
    };
  }
}

function toEvaluationReport(vote: EvaluatorVote): EvaluationReport {
  return {
    agentId: vote.evaluatorId,
    agentRole: roleFor(vote.evaluatorId),
    verdict: vote.verdict,
    confidence: vote.score / 10,
    findings: vote.comments,
    timestamp: new Date(),
  };
}

function roleFor(evaluatorId: string): AgentRole {
  switch (evaluatorId) {
    case "narratologist":
      return AgentRole.Narratologist;
    case "pacing":
      return AgentRole.PacingAnalyst;
    case "character":
      return AgentRole.CharacterConsistency;
    case "thematic":
      return AgentRole.ThematicCoherence;
    case "worldbuilding":
      return AgentRole.Worldbuilding;
    case "mood":
      return AgentRole.MoodTensionCurator;
    case "fact-checker":
      return AgentRole.FactChecker;
    case "localizer":
      return AgentRole.Localizer;
    case "narrative-consistency":
      return AgentRole.NarrativeConsistency;
    case "critic":
      return AgentRole.Critic;
    case "editor":
      return AgentRole.Editor;
    default:
      return AgentRole.Critic;
  }
}

function verdictForScore(score: number): EvaluationVerdict {
  if (score >= 7) return "pass";
  if (score >= 4) return "conditional";
  return "reject";
}

function summarize(votes: EvaluatorVote[]): string {
  return votes
    .filter((vote) => vote.verdict !== "pass")
    .flatMap((vote) => vote.comments.map((comment) => `${vote.role}: ${comment}`))
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
