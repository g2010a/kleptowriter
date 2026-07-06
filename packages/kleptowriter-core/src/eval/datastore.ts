import type { SceneDocument, SceneMetadata } from "../data-model/scene/index.js";

export interface SceneQuery {
  pov?: string;
  characters?: string[];
  locations?: string[];
  plotThreads?: string[];
  timelineStart?: string;
  timelineEnd?: string;
  minTension?: number;
  maxTension?: number;
}

export class SceneDatastore {
  private readonly scenes: Map<string, SceneDocument> = new Map();
  private readonly byCharacter: Map<string, Set<string>> = new Map();

  store(scene: SceneDocument): void {
    if (this.scenes.has(scene.id)) this.delete(scene.id);

    this.scenes.set(scene.id, scene);
    for (const characterId of scene.metadata.characters) {
      const sceneIds = this.byCharacter.get(characterId) ?? new Set<string>();
      sceneIds.add(scene.id);
      this.byCharacter.set(characterId, sceneIds);
    }
  }

  get(sceneId: string): SceneDocument | undefined {
    return this.scenes.get(sceneId);
  }

  query(filter: SceneQuery): SceneDocument[] {
    return this.getAll().filter((scene) => matches(scene.metadata, filter));
  }

  getScenesByCharacter(characterId: string): SceneDocument[] {
    return [...(this.byCharacter.get(characterId) ?? [])].flatMap((sceneId) => {
      const scene = this.scenes.get(sceneId);
      return scene ? [scene] : [];
    });
  }

  getAll(): SceneDocument[] {
    return [...this.scenes.values()];
  }

  delete(sceneId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    this.scenes.delete(sceneId);
    for (const characterId of scene.metadata.characters) {
      const sceneIds = this.byCharacter.get(characterId);
      if (!sceneIds) continue;

      sceneIds.delete(sceneId);
      if (sceneIds.size === 0) this.byCharacter.delete(characterId);
    }

    return true;
  }
}

function matches(metadata: SceneMetadata, filter: SceneQuery): boolean {
  if (filter.pov !== undefined && metadata.pov !== filter.pov) return false;
  if (filter.characters && !containsAll(metadata.characters, filter.characters)) return false;
  if (filter.locations && !containsAll(metadata.locations, filter.locations)) return false;
  if (filter.plotThreads && !containsAll(metadata.plotThreads, filter.plotThreads)) return false;
  if (filter.minTension !== undefined && (metadata.tension === undefined || metadata.tension < filter.minTension)) return false;
  if (filter.maxTension !== undefined && (metadata.tension === undefined || metadata.tension > filter.maxTension)) return false;

  const timeline = parseTimeline(metadata.chronology);
  const start = parseTimeline(filter.timelineStart);
  const end = parseTimeline(filter.timelineEnd);
  if (start !== null && (timeline === null || timeline < start)) return false;
  if (end !== null && (timeline === null || timeline > end)) return false;

  return true;
}

function containsAll(values: string[], required: string[]): boolean {
  return required.every((value) => values.includes(value));
}

function parseTimeline(value: string | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}
