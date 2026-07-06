import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { SceneDocument } from "../data-model/scene/types.js";
import type { CharacterId, EvaluationVerdict, LocationId, SceneId } from "../types/scene.js";
import type { LiteraryAgent } from "./types.js";

export interface NarrativeConsistencyAgent extends LiteraryAgent {
  checkGlobalConsistency(bible: StoryBible, scenes: SceneDocument[]): Promise<ConsistencyReport>;
  validateTimeline(bible: StoryBible): Promise<TimelineValidation>;
}

export interface LocalizerAgent extends LiteraryAgent {
  checkCulturalAccuracy(content: string, target: string): Promise<LocalizationNote[]>;
  suggestLocalizations(content: string, target: string): Promise<LocalizedText[]>;
}

export interface ConsistencyReport {
  agentId: string;
  verdict: EvaluationVerdict;
  confidence: number;
  timelineIssues: TimelineIssue[];
  characterIssues: CharacterConsistencyIssue[];
  plotHoles: PlotHole[];
  worldbuildingViolations: WorldbuildingViolation[];
  overallScore: number;
}

export interface TimelineIssue {
  type: "gap" | "overlap" | "contradiction";
  description: string;
  sceneIds: SceneId[];
  severity: "minor" | "major";
}

export interface CharacterConsistencyIssue {
  characterId: CharacterId;
  description: string;
  sceneIds: SceneId[];
  severity: "minor" | "major";
}

export interface PlotHole {
  description: string;
  relatedThreads: string[];
  severity: "minor" | "major";
}

export interface WorldbuildingViolation {
  description: string;
  locationId?: LocationId;
  severity: "minor" | "major";
}

export interface TimelineValidation {
  valid: boolean;
  gaps: { start: SceneId; end: SceneId; duration: string }[];
  paradoxes: string[];
}

export interface LocalizationNote {
  element: string;
  original: string;
  issue: string;
  suggestion: string;
  severity: "critical" | "recommended" | "optional";
}

export interface LocalizedText {
  original: string;
  localized: string;
  context: string;
}
