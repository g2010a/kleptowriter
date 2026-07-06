import type { CharacterId, SceneId } from "../../types/index.js";
import type { KnowledgeGraph } from "./interfaces.js";

export interface KnowledgeGraphEntry {
  characterId: CharacterId;
  fact: string;
  sceneId: SceneId;
  timestamp: Date;
}

export class KnowledgeGraphImpl implements KnowledgeGraph {
  private readonly entries: KnowledgeGraphEntry[] = [];

  learn(characterId: CharacterId, fact: string, sceneId: SceneId): void {
    this.entries.push({ characterId, fact, sceneId, timestamp: new Date() });
  }

  knows(characterId: CharacterId, fact: string, upToScene?: SceneId): boolean {
    const sceneOrder = upToScene ? this.sceneOrder() : undefined;
    const limit = upToScene ? sceneOrder?.get(upToScene) : undefined;

    if (upToScene && limit === undefined) {
      return false;
    }

    return this.entries.some((entry) => {
      if (entry.characterId !== characterId || entry.fact !== fact) {
        return false;
      }

      return limit === undefined || (sceneOrder?.get(entry.sceneId) ?? Infinity) <= limit;
    });
  }

  queryFactsByCharacter(characterId: CharacterId): string[] {
    return [...new Set(this.entries.filter((entry) => entry.characterId === characterId).map((entry) => entry.fact))];
  }

  allFacts(): Map<string, Set<string>> {
    const facts = new Map<string, Set<string>>();

    for (const entry of this.entries) {
      const characters = facts.get(entry.fact) ?? new Set<string>();
      characters.add(entry.characterId);
      facts.set(entry.fact, characters);
    }

    return facts;
  }

  getKnowledgeTimeline(characterId: CharacterId): KnowledgeGraphEntry[] {
    return [...this.entries]
      .filter((entry) => entry.characterId === characterId)
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  }

  charactersSharingFact(fact: string): CharacterId[] {
    return [...new Set(this.entries.filter((entry) => entry.fact === fact).map((entry) => entry.characterId))];
  }

  factsLearnedInScene(sceneId: SceneId): string[] {
    return [...new Set(this.entries.filter((entry) => entry.sceneId === sceneId).map((entry) => entry.fact))];
  }

  toEdgeList(): { from: CharacterId; fact: string; sceneId: SceneId }[] {
    return this.entries.map((entry) => ({
      from: entry.characterId,
      fact: entry.fact,
      sceneId: entry.sceneId,
    }));
  }

  private sceneOrder(): Map<SceneId, number> {
    const order = new Map<SceneId, number>();

    for (const entry of this.entries) {
      if (!order.has(entry.sceneId)) {
        order.set(entry.sceneId, order.size);
      }
    }

    return order;
  }
}
