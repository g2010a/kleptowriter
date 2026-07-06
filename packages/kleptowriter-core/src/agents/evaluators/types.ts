import type { StoryBible } from "../../data-model/bible/interfaces.js";
import type { SceneDocument } from "../../data-model/scene/types.js";
import type { EvaluationVerdict, SceneId } from "../../types/scene.js";
import type { LiteraryAgent } from "../types.js";

export interface StyleGuide {
  rules: string[];
  customFields?: Record<string, unknown>;
}

export interface BaseEvaluationReport {
  agentId: string;
  sceneId: SceneId;
  verdict: EvaluationVerdict;
  confidence: number;
  findings: string[];
  timestamp: Date;
}

export interface NarrativeReport extends BaseEvaluationReport {
  structureScore: number;
  plotCoherenceScore: number;
  genreAlignment: string;
}

export interface PacingReport extends BaseEvaluationReport {
  paceRating: string;
  tensionArc: string;
  sceneLengthAppropriate: boolean;
}

export interface CharacterConsistencyReport extends BaseEvaluationReport {
  characterId: string;
  consistencyScore: number;
  personalityDeviation: string[];
}

export interface ThematicCoherenceReport extends BaseEvaluationReport {
  themes: { theme: string; score: number; evidence: string }[];
}

export interface WorldbuildingReport extends BaseEvaluationReport {
  worldConsistency: number;
  loreViolations: string[];
}

export interface DialogueReport extends BaseEvaluationReport {
  naturalnessScore: number;
  characterVoiceDistinct: boolean;
  dialogueTagsVariety: number;
}

export interface StyleReport extends BaseEvaluationReport {
  styleGuideAdherence: number;
  sentenceVariety: number;
  passiveVoiceInstances: number;
}

export interface MoodTensionReport extends BaseEvaluationReport {
  moodTags: string[];
  tensionLevel: number;
  desiredTension: number;
}

export interface NarratologistAgent extends LiteraryAgent {
  evaluateNarrative(scene: SceneDocument, bible: StoryBible): NarrativeReport;
}

export interface PacingAnalystAgent extends LiteraryAgent {
  evaluatePacing(scene: SceneDocument, bible: StoryBible): PacingReport;
}

export interface CharacterConsistencyAgent extends LiteraryAgent {
  evaluateCharacterConsistency(
    scene: SceneDocument,
    bible: StoryBible,
  ): CharacterConsistencyReport;
}

export interface ThematicCoherenceAgent extends LiteraryAgent {
  evaluateThematicCoherence(
    scene: SceneDocument,
    bible: StoryBible,
  ): ThematicCoherenceReport;
}

export interface WorldbuildingAgent extends LiteraryAgent {
  evaluateWorldbuilding(scene: SceneDocument, bible: StoryBible): WorldbuildingReport;
}

export interface DialogistAgent extends LiteraryAgent {
  evaluateDialogue(scene: SceneDocument, bible: StoryBible): DialogueReport;
}

export interface StylesheetAgent extends LiteraryAgent {
  evaluateStyle(scene: SceneDocument, styleGuide: StyleGuide): StyleReport;
}

export interface MoodTensionCuratorAgent extends LiteraryAgent {
  evaluateMoodTension(scene: SceneDocument, bible: StoryBible): MoodTensionReport;
}
