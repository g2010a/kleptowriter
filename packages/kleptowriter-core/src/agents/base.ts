import { AgentRole } from "../types/enums.js";
import type { CapabilityTier } from "../types/scene.js";
import type { AgentContext, AgentMode, LiteraryAgent } from "./types.js";

const EVALUATOR_ROLES = new Set<AgentRole>([
  AgentRole.Editor,
  AgentRole.Critic,
  AgentRole.FactChecker,
  AgentRole.Narratologist,
  AgentRole.PacingAnalyst,
  AgentRole.CharacterConsistency,
  AgentRole.ThematicCoherence,
  AgentRole.Stylesheet,
  AgentRole.MoodTensionCurator,
  AgentRole.NarrativeConsistency,
]);

export abstract class BaseAgent implements LiteraryAgent {
  readonly id: string;
  readonly role: AgentRole;
  readonly capabilityTier: CapabilityTier[];
  readonly mode: AgentMode;
  readonly canEvaluate: boolean;
  readonly canGenerate: boolean;
  protected context?: AgentContext;

  constructor(config: {
    id: string;
    role: AgentRole;
    capabilityTier: CapabilityTier[];
    mode: AgentMode;
  }) {
    this.id = config.id;
    this.role = config.role;
    this.capabilityTier = config.capabilityTier;
    this.mode = config.mode;
    this.canEvaluate = EVALUATOR_ROLES.has(config.role) && config.capabilityTier.includes("evaluation");
    this.canGenerate = config.capabilityTier.includes("prose-gen");
  }

  setStoryContext(context: AgentContext): void {
    this.context = context;
  }
}
