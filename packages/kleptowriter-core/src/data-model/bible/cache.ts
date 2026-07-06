import type { CharacterId, LocationId, SceneId } from "../../types/index.js";
import type {
  ArcTracker,
  CharacterState,
  DramaticQuestion,
  ItemState,
  KnowledgeGraph,
  LocationState,
  PlotThread,
  StoryBible,
  ThematicProgression,
} from "./interfaces.js";

type EntityMap<T extends object> = Map<string, T>;

export type StoryBibleUpdate = Partial<Omit<StoryBible, "characters" | "locations" | "items" | "arcs" | "plotThreads" | "dramaticQuestions">> & {
  characters?: Map<CharacterId, Partial<CharacterState>>;
  locations?: Map<LocationId, Partial<LocationState>>;
  items?: Map<string, Partial<ItemState>>;
  arcs?: Map<string, Partial<ArcTracker>>;
  plotThreads?: Map<string, Partial<PlotThread>>;
  dramaticQuestions?: Map<string, Partial<DramaticQuestion>>;
};

export class InMemoryStoryBible implements StoryBible {
  characters = new Map<CharacterId, CharacterState>();
  locations = new Map<LocationId, LocationState>();
  items = new Map<string, ItemState>();
  chronology: StoryBible["chronology"] = [];
  arcs = new Map<string, ArcTracker>();
  plotThreads = new Map<string, PlotThread>();
  dramaticQuestions = new Map<string, DramaticQuestion>();
  knowledgeState: KnowledgeGraph = createEmptyKnowledgeGraph();
  thematicProgression: ThematicProgression = createEmptyThematicProgression();

  #version = 0;

  get version(): number {
    return this.#version;
  }

  applyStateUpdate(updates: Partial<StoryBible> | StoryBibleUpdate): number {
    mergeMap(this.characters, updates.characters);
    mergeMap(this.locations, updates.locations);
    mergeMap(this.items, updates.items);
    mergeMap(this.arcs, updates.arcs);
    mergeMap(this.plotThreads, updates.plotThreads);
    mergeMap(this.dramaticQuestions, updates.dramaticQuestions);

    if (updates.chronology) this.chronology = updates.chronology;
    if (updates.knowledgeState) this.knowledgeState = updates.knowledgeState;
    if (updates.thematicProgression) this.thematicProgression = updates.thematicProgression;

    return ++this.#version;
  }

  getCharacter(id: CharacterId): CharacterState | undefined {
    return this.characters.get(id);
  }

  getLocation(id: LocationId): LocationState | undefined {
    return this.locations.get(id);
  }

  getItem(id: string): ItemState | undefined {
    return this.items.get(id);
  }

  getArc(id: string): ArcTracker | undefined {
    return this.arcs.get(id);
  }

  getPlotThread(id: string): PlotThread | undefined {
    return this.plotThreads.get(id);
  }

  getDramaticQuestion(id: string): DramaticQuestion | undefined {
    return this.dramaticQuestions.get(id);
  }

  queryCharacters(filter: { name?: string; tags?: string[]; sceneId?: SceneId }): CharacterState[] {
    return [...this.characters.values()].filter((character) => {
      if (filter.name && !matchesText(character.name, filter.name, character.aliases)) return false;
      if (filter.tags?.some((tag) => !character.tags.includes(tag))) return false;
      if (filter.sceneId && character.lastSeenScene !== filter.sceneId) return false;
      return true;
    });
  }

  queryScenesByCharacter(characterId: CharacterId): SceneId[] {
    const character = this.characters.get(characterId);
    if (!character) return [];

    const scenes = new Set<SceneId>();

    for (const thread of this.plotThreads.values()) {
      if (mentionsCharacter(`${thread.name} ${thread.description}`, character)) {
        for (const sceneId of thread.relatedSceneIds) scenes.add(sceneId);
      }
    }

    for (const question of this.dramaticQuestions.values()) {
      if (!mentionsCharacter(question.question, character)) continue;
      scenes.add(question.raisedInScene);
      if (question.answeredInScene) scenes.add(question.answeredInScene);
    }

    return [...scenes];
  }

  getAllEntities(): {
    characters: CharacterState[];
    locations: LocationState[];
    items: ItemState[];
    arcs: ArcTracker[];
    plotThreads: PlotThread[];
    dramaticQuestions: DramaticQuestion[];
  } {
    return {
      characters: [...this.characters.values()],
      locations: [...this.locations.values()],
      items: [...this.items.values()],
      arcs: [...this.arcs.values()],
      plotThreads: [...this.plotThreads.values()],
      dramaticQuestions: [...this.dramaticQuestions.values()],
    };
  }

  toJSON(): StoryBible {
    return {
      characters: new Map(this.characters),
      locations: new Map(this.locations),
      items: new Map(this.items),
      chronology: [...this.chronology],
      arcs: new Map(this.arcs),
      plotThreads: new Map(this.plotThreads),
      dramaticQuestions: new Map(this.dramaticQuestions),
      knowledgeState: this.knowledgeState,
      thematicProgression: this.thematicProgression,
    };
  }
}

function mergeMap<T extends object>(target: EntityMap<T>, updates: Map<string, Partial<T>> | undefined): void {
  if (!updates) return;
  for (const [id, update] of updates) {
    target.set(id, { ...target.get(id), ...update } as T);
  }
}

function matchesText(value: string, query: string, aliases: string[]): boolean {
  const normalizedQuery = query.toLocaleLowerCase();
  return [value, ...aliases].some((candidate) => candidate.toLocaleLowerCase().includes(normalizedQuery));
}

function mentionsCharacter(text: string, character: CharacterState): boolean {
  return [character.id, character.name, ...character.aliases].some((needle) =>
    text.toLocaleLowerCase().includes(needle.toLocaleLowerCase()),
  );
}

function createEmptyKnowledgeGraph(): KnowledgeGraph {
  const factsByCharacter = new Map<CharacterId, Map<string, SceneId>>();

  return {
    knows(characterId, fact) {
      return factsByCharacter.get(characterId)?.has(fact) ?? false;
    },
    learn(characterId, fact, sceneId) {
      const facts = factsByCharacter.get(characterId) ?? new Map<string, SceneId>();
      facts.set(fact, sceneId);
      factsByCharacter.set(characterId, facts);
    },
    queryFactsByCharacter(characterId) {
      return [...(factsByCharacter.get(characterId)?.keys() ?? [])];
    },
    allFacts() {
      return new Map([...factsByCharacter].map(([id, facts]) => [id, new Set(facts.keys())]));
    },
  };
}

function createEmptyThematicProgression(): ThematicProgression {
  return {
    themes: new Map(),
    getIntensity(theme) {
      return this.themes.get(theme)?.intensity ?? 0;
    },
    recordIntensity(theme, sceneId, intensity) {
      const current = this.themes.get(theme) ?? { intensity, sceneIntensities: new Map<SceneId, number>() };
      current.intensity = intensity;
      current.sceneIntensities.set(sceneId, intensity);
      this.themes.set(theme, current);
    },
  };
}
