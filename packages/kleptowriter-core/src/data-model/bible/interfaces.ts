import type { CharacterId, LocationId, SceneId } from "../../types/index.js";

export interface StoryBible {
  characters: Map<CharacterId, CharacterState>;
  locations: Map<LocationId, LocationState>;
  items: Map<string, ItemState>;
  chronology: TimelineEntry[];
  arcs: Map<string, ArcTracker>;
  plotThreads: Map<string, PlotThread>;
  dramaticQuestions: Map<string, DramaticQuestion>;
  knowledgeState: KnowledgeGraph;
  thematicProgression: ThematicProgression;
  stylometry?: StylometryProfile;
}

export interface StylometryProfile {
  narrativeVoice?: string;
  povStyle?: string;
  tensePreference?: string;
  vocabularyRegister?: string;
  sentenceLengthTarget?: string;
  proseStyleNotes?: string;
  dialogueStyleNotes?: string;
  pacingPreference?: string;
  paragraphStructure?: string;
  rhetoricalDevices?: string;
  commaStyle?: string;
  dialogueTagPreference?: string;
}

export interface CharacterState {
  id: CharacterId;
  name: string;
  aliases: string[];
  tags: string[];
  traits: Record<string, string>;
  relationships: Map<CharacterId, string>;
  knowledge: Set<string>;
  arcBeatIds: string[];
  lastSeenScene?: SceneId;
}

export interface LocationState {
  id: LocationId;
  name: string;
  aliases: string[];
  tags: string[];
  description: string;
  relatedLocations: LocationId[];
}

export interface ItemState {
  id: string;
  name: string;
  aliases: string[];
  tags: string[];
  description: string;
  owner?: CharacterId;
  currentLocation?: LocationId;
}

export interface TimelineEntry {
  sceneId: SceneId;
  timestamp: Date | "unknown";
  duration?: string;
  timeOfDay?: string;
}

export interface ArcTracker {
  id: string;
  name: string;
  description: string;
  beatIds: string[];
  completedBeatIds: string[];
  progress: number;
}

export interface PlotThread {
  id: string;
  name: string;
  description: string;
  status: "introduced" | "developed" | "resolved" | "dropped";
  relatedSceneIds: SceneId[];
}

export interface DramaticQuestion {
  id: string;
  question: string;
  status: "raised" | "partially_answered" | "answered";
  raisedInScene: SceneId;
  answeredInScene?: SceneId;
}

export interface KnowledgeGraph {
  knows(characterId: CharacterId, fact: string, upToScene?: SceneId): boolean;
  learn(characterId: CharacterId, fact: string, sceneId: SceneId): void;
  queryFactsByCharacter(characterId: CharacterId): string[];
  allFacts(): Map<string, Set<string>>;
}

export interface ThemeIntensity {
  intensity: number;
  sceneIntensities: Map<SceneId, number>;
}

export interface ThematicProgression {
  themes: Map<string, ThemeIntensity>;
  getIntensity(theme: string): number;
  recordIntensity(theme: string, sceneId: SceneId, intensity: number): void;
}
