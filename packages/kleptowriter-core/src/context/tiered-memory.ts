import type { SceneDocument } from "../data-model/scene/index.js";

export type MemoryTier = "hot" | "warm" | "cold";

export interface HotMemory {
  currentScene?: SceneDocument;
  recentScenes: SceneDocument[];
  activePlotThreads: string[];
}

export interface WarmMemory {
  sceneSummaries: Map<string, string>;
  chapterSummaries: Map<string, string>;
  characterStates: Map<string, unknown>;
}

export interface ColdMemory {
  sceneIds: string[];
  timeline: string[];
}

export class TieredMemory {
  private readonly maxRecentScenes = 5;
  private hot: HotMemory = { recentScenes: [], activePlotThreads: [] };
  private warm: WarmMemory = {
    sceneSummaries: new Map(),
    chapterSummaries: new Map(),
    characterStates: new Map(),
  };
  private cold: ColdMemory = { sceneIds: [], timeline: [] };

  setCurrentScene(scene: SceneDocument): void {
    this.hot.currentScene = scene;
    this.addToRecent(scene);
    this.hot.activePlotThreads = scene.metadata.plotThreads;
  }

  addToRecent(scene: SceneDocument): void {
    this.hot.recentScenes = [...this.hot.recentScenes.filter((recent) => recent.id !== scene.id), scene].slice(
      -this.maxRecentScenes,
    );
  }

  addSummary(sceneId: string, summary: string): void {
    this.warm.sceneSummaries.set(sceneId, summary);
  }

  query(tier: MemoryTier, key: string): unknown {
    if (tier === "hot") {
      if (this.hot.currentScene?.id === key) return this.hot.currentScene;
      return this.hot.recentScenes.find((scene) => scene.id === key);
    }

    if (tier === "warm") {
      return (
        this.warm.sceneSummaries.get(key) ??
        this.warm.chapterSummaries.get(key) ??
        this.warm.characterStates.get(key)
      );
    }

    return this.cold.sceneIds.includes(key) ? key : undefined;
  }

  promote(sceneId: string): void {
    this.cold.sceneIds = this.cold.sceneIds.filter((id) => id !== sceneId);
  }

  demote(sceneId: string): void {
    if (this.hot.currentScene?.id === sceneId) {
      delete this.hot.currentScene;
    }

    this.hot.recentScenes = this.hot.recentScenes.filter((scene) => scene.id !== sceneId);

    if (!this.cold.sceneIds.includes(sceneId)) {
      this.cold.sceneIds.push(sceneId);
    }
  }

  getHot(): HotMemory {
    return this.hot;
  }

  getWarm(): WarmMemory {
    return this.warm;
  }

  getCold(): ColdMemory {
    return this.cold;
  }
}
