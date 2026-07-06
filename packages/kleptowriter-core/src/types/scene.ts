import type { AgentRole } from "./enums.js";

export type SceneId = string;
export type ChapterId = string;
export type CharacterId = string;
export type LocationId = string;

export type CapabilityTier =
  | "prose-gen"
  | "analysis"
  | "research"
  | "creativity"
  | "evaluation"
  | "coordination"
  | "fact-checking"
  | "localization"
  | "archival";

export type EvaluationVerdict = "pass" | "conditional" | "reject";

export interface EvaluationReport {
  agentId: string;
  agentRole: AgentRole;
  verdict: EvaluationVerdict;
  confidence: number;
  findings: string[];
  timestamp: Date;
}

export interface ScenePlan {}

export interface GateResult {
  verdict: EvaluationVerdict;
  score: number;
  evaluatorReports: EvaluationReport[];
  alternatives?: ScenePlan[];
  message: string;
}
