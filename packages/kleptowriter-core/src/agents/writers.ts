import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { SceneDocument } from "../data-model/scene/types.js";
import type { LiteraryAgent } from "./types.js";
import type { EvaluationVerdict, SceneId, ScenePlan } from "../types/scene.js";

export interface CritiqueReport {
  agentId: string;
  sceneId: SceneId;
  verdict: EvaluationVerdict;
  confidence: number;
  findings: Finding[];
  overallScore: number;
  timestamp: Date;
}

export interface Finding {
  category: string;
  severity: "critical" | "major" | "minor" | "suggestion";
  description: string;
  location?: string;
}

export interface Edit {
  type: "insert" | "delete" | "replace";
  location: { start: number; end: number };
  text: string;
  reason: string;
}

export interface StyleGuide {
  maxSentenceLength?: number;
  passiveVoiceAvoidance?: boolean;
  dialogueTags?: string[];
  tone?: string;
}

export interface WriterAgent extends LiteraryAgent {
  generateScene(plan: ScenePlan, bible: StoryBible): Promise<SceneDocument>;
  reviseScene(scene: SceneDocument, feedback: CritiqueReport): Promise<SceneDocument>;
}

export interface EditorAgent extends LiteraryAgent {
  editScene(prose: string, styleGuide?: StyleGuide): Edit[];
  suggestRewrites(scene: SceneDocument, focus: string): string[];
}

export interface CriticAgent extends LiteraryAgent {
  evaluateScene(scene: SceneDocument, bible: StoryBible): Promise<CritiqueReport>;
  evaluatePlan(plan: ScenePlan, bible: StoryBible): Promise<CritiqueReport>;
}
