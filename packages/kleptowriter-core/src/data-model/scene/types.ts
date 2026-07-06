import type { CharacterId, LocationId, SceneId, SceneStatus } from "../../types/index.js";

export interface SceneMetadata {
  pov?: CharacterId;
  characters: CharacterId[];
  locations: LocationId[];
  chronology?: string;
  tension?: number;
  mood?: string;
  plotThreads: string[];
  thematicMotifs: string[];
  dramaticQuestions: string[];
}

export interface SceneDocument {
  id: SceneId;
  title: string;
  status: SceneStatus;
  metadata: SceneMetadata;
  prose: string;
  customFields: Record<string, unknown>;
  unused?: never;
}

export type SceneReadResult =
  | { ok: true; data: SceneDocument }
  | { ok: false; error: string };
