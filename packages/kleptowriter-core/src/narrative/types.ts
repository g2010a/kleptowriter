import type { EvaluationReport, EvaluationVerdict } from "../types/scene.js";

export interface ScenePlan {
  beatId: string;
  purpose: string;
  suggestedPov?: string;
  suggestedCharacters: string[];
  targetTension?: number;
  plotThreads: string[];
  dramaticQuestions: string[];
  thematicMotifs: string[];
  alternatives?: ScenePlan[];
}

export interface ScenePlanMetadata {
  complexity: "simple" | "moderate" | "complex";
  expectedLength: number;
  estimatedTokens: number;
  structuralArchetype?: string;
}

export interface PlanGateDecision {
  verdict: EvaluationVerdict;
  score: number;
  evaluatorReports: EvaluationReport[];
  alternatives?: ScenePlan[];
  message: string;
}
