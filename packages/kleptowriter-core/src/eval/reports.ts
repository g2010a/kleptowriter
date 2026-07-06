import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import type { EvaluationVerdict } from "../types/scene.js";

export type EvaluatorRole =
  | "narratologist"
  | "pacing-analyst"
  | "character-consistency"
  | "thematic-coherence"
  | "worldbuilding"
  | "dialogist"
  | "stylesheet"
  | "mood-tension-curator";

export interface EvaluationFinding {
  category: string;
  severity: "blocking" | "warning" | "info";
  message: string;
  location?: string;
}

export interface BaseEvaluationReport {
  agentId: string;
  role: EvaluatorRole;
  sceneId: string;
  verdict: EvaluationVerdict;
  score: number;
  confidence: number;
  findings: EvaluationFinding[];
  timestamp: number;
  summary: string;
}

export interface NarratologistReport extends BaseEvaluationReport {
  role: "narratologist";
  structureScore: number;
  plotCoherenceScore: number;
  genreAlignment: string;
}

export interface PacingReport extends BaseEvaluationReport {
  role: "pacing-analyst";
  wordCount: number;
  estimatedReadingTime: number;
  beatBalance: number;
}

export interface CharacterConsistencyReport extends BaseEvaluationReport {
  role: "character-consistency";
  characterId: string;
  consistencyScore: number;
  personalityDeviation: string[];
}

export interface ThematicCoherenceReport extends BaseEvaluationReport {
  role: "thematic-coherence";
  themes: { theme: string; score: number; evidence: string }[];
}

export interface WorldbuildingReport extends BaseEvaluationReport {
  role: "worldbuilding";
  worldConsistency: number;
  loreViolations: string[];
}

export interface DialogistReport extends BaseEvaluationReport {
  role: "dialogist";
  naturalnessScore: number;
  characterVoiceDistinct: boolean;
  dialogueTagsVariety: number;
}

export interface StylesheetReport extends BaseEvaluationReport {
  role: "stylesheet";
  styleGuideAdherence: number;
  sentenceVariety: number;
  passiveVoiceInstances: number;
}

export interface MoodTensionReport extends BaseEvaluationReport {
  role: "mood-tension-curator";
  moodTags: string[];
  tensionLevel: number;
  desiredTension: number;
}

export type TypedEvaluationReport =
  | NarratologistReport
  | PacingReport
  | CharacterConsistencyReport
  | ThematicCoherenceReport
  | WorldbuildingReport
  | DialogistReport
  | StylesheetReport
  | MoodTensionReport;

export async function saveReport(report: TypedEvaluationReport, directory: string): Promise<void> {
  const reportDirectory = join(directory, "evaluations", report.sceneId);
  await mkdir(reportDirectory, { recursive: true });
  const fileName = `${report.timestamp}-${sanitize(report.agentId)}-${report.role}.json`;
  await writeFile(join(reportDirectory, fileName), `${JSON.stringify(report, null, 2)}\n`);
}

export async function loadReports(sceneId: string, directory: string): Promise<TypedEvaluationReport[]> {
  const reportDirectory = join(directory, "evaluations", sceneId);
  const entries = await readdir(reportDirectory, { encoding: "utf8", withFileTypes: true }).catch(() => [] as Dirent[]);
  const reports: TypedEvaluationReport[] = [];

  for (const entry of entries) {
    const name = entry.name.toString();
    if (entry.isFile() && name.endsWith(".json")) reports.push(parseReport(await readFile(join(reportDirectory, name), "utf8")));
  }

  return reports.sort((left, right) => left.timestamp - right.timestamp);
}

function parseReport(content: string): TypedEvaluationReport {
  return JSON.parse(content) as TypedEvaluationReport;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
