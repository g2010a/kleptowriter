import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { SceneDocument } from "../data-model/scene/types.js";
import type { SceneId } from "../types/index.js";
import type { AgentContext, LiteraryAgent } from "./types.js";

export interface Idea {
  id: string;
  title: string;
  description: string;
  type: "plot_twist" | "character_development" | "setting_detail" | "dialogue" | "theme_exploration";
  confidence: number;
  relatedBeats?: string[];
}

export interface IdeaConstraints {
  mustInclude?: string[];
  mustAvoid?: string[];
  tone?: string;
  maxComplexity?: number;
}

export interface ResearchNote {
  topic: string;
  summary: string;
  sources: string[];
  keyFacts: string[];
  relevanceToStory: string;
}

export interface FactCheckResult {
  claim: string;
  status: "confirmed" | "contradicted" | "unsupported" | "unverifiable";
  evidence: string[];
  confidence: number;
}

export interface Contradiction {
  type: "chronology" | "character_knowledge" | "location" | "plot" | "fact";
  description: string;
  entityIds: string[];
  severity: "minor" | "major";
}

export interface FactCheckReport {
  agentId: string;
  sceneId: SceneId;
  overallStatus: "consistent" | "minor_issues" | "major_issues";
  checks: FactCheckResult[];
  contradictions: Contradiction[];
}

export interface IdeatorAgent extends LiteraryAgent {
  generateIdeas(constraints: IdeaConstraints, bible: StoryBible): Promise<Idea[]>;
  brainstorm(count: number, context: AgentContext): Promise<Idea[]>;
}

export interface ResearcherAgent extends LiteraryAgent {
  research(topic: string): Promise<ResearchNote[]>;
  verifyFact(claim: string, bible: StoryBible): Promise<FactCheckResult>;
}

export interface FactCheckerAgent extends LiteraryAgent {
  verifyFacts(scene: SceneDocument, bible: StoryBible): Promise<FactCheckReport>;
  checkContradictions(scene: SceneDocument, bible: StoryBible): Promise<Contradiction[]>;
}
