import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { SceneDocument } from "../data-model/scene/types.js";
import type { AgentRole } from "../types/enums.js";
import type { CapabilityTier } from "../types/scene.js";

export type AgentMode = "evaluation" | "generation" | "research" | "coordination";

export interface MarkovStructureGuidance {}

export interface AgentContext {
  bible?: StoryBible;
  currentScene?: SceneDocument;
  structure?: MarkovStructureGuidance;
  sessionId?: string;
}

export interface LiteraryAgent {
  readonly id: string;
  readonly role: AgentRole;
  readonly capabilityTier: CapabilityTier[];
  readonly mode: AgentMode;
  readonly canEvaluate: boolean;
  readonly canGenerate: boolean;
  setStoryContext(context: AgentContext): void;
}

export interface AgentConfig {
  modelTier: "fast" | "balanced" | "premium";
  maxTokensPerResponse: number;
  permissions: {
    canReadWiki: boolean;
    canWriteWiki: boolean;
    canReadBible: boolean;
    canUpdateBible: boolean;
    canQueryAgents: boolean;
  };
}
