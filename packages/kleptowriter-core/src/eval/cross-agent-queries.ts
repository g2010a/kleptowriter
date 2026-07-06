import type { AgentRegistry } from "../agents/registry.js";
import type { StoryBible } from "../data-model/bible/interfaces.js";

export type CrossQueryType =
  | "character-state"
  | "location-info"
  | "plot-thread-status"
  | "evaluation-report"
  | "scene-metadata"
  | "knowledge-fact";

export interface CrossQuery {
  queryId: string;
  fromAgent: string;
  toAgent: string;
  type: CrossQueryType;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface CrossQueryResult {
  queryId: string;
  success: boolean;
  data: unknown;
  error?: string;
  timestamp: number;
}

export class CrossAgentQueryRouter {
  constructor(
    private readonly bible: StoryBible,
    private readonly registry?: AgentRegistry,
  ) {}

  execute(query: CrossQuery): CrossQueryResult {
    try {
      if (this.registry !== undefined && this.registry.getAgent(query.toAgent) === undefined) {
        return this.error(query.queryId, `Unknown target agent: ${query.toAgent}`);
      }

      switch (query.type) {
        case "character-state":
          return this.ok(query.queryId, this.queryCharacterState(query.params));
        case "location-info":
          return this.ok(query.queryId, this.queryLocationInfo(query.params));
        case "plot-thread-status":
          return this.ok(query.queryId, this.queryPlotThread(query.params));
        case "evaluation-report":
          return this.ok(query.queryId, query.params.report ?? null);
        case "scene-metadata":
          return this.ok(query.queryId, query.params.metadata ?? null);
        case "knowledge-fact":
          return this.ok(query.queryId, this.queryKnowledgeFact(query.params));
        default:
          return this.error(query.queryId, `Unknown query type: ${String(query.type)}`);
      }
    } catch (error) {
      return this.error(query.queryId, error instanceof Error ? error.message : String(error));
    }
  }

  private queryCharacterState(params: Record<string, unknown>): unknown {
    return this.findByIdOrName(this.bible.characters, params.characterId ?? params.id ?? params.name);
  }

  private queryLocationInfo(params: Record<string, unknown>): unknown {
    return this.findByIdOrName(this.bible.locations, params.locationId ?? params.id ?? params.name);
  }

  private queryPlotThread(params: Record<string, unknown>): unknown {
    return this.findByIdOrName(this.bible.plotThreads, params.plotThreadId ?? params.threadId ?? params.id ?? params.name);
  }

  private queryKnowledgeFact(params: Record<string, unknown>): unknown {
    const characterId = typeof params.characterId === "string" ? params.characterId : undefined;
    const fact = typeof params.fact === "string" ? params.fact : undefined;

    if (characterId !== undefined && fact !== undefined) {
      return this.bible.knowledgeState.knows(characterId, fact, typeof params.upToScene === "string" ? params.upToScene : undefined);
    }

    if (characterId !== undefined) {
      return this.bible.knowledgeState.queryFactsByCharacter(characterId);
    }

    return this.bible.knowledgeState.allFacts();
  }

  private findByIdOrName<T extends { name?: string; aliases?: string[] }>(entries: Map<string, T>, value: unknown): T | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    return entries.get(value) ?? [...entries.values()].find((entry) => entry.name === value || entry.aliases?.includes(value));
  }

  private ok(queryId: string, data: unknown): CrossQueryResult {
    return { queryId, success: true, data, timestamp: Date.now() };
  }

  private error(queryId: string, error: string): CrossQueryResult {
    return { queryId, success: false, data: null, error, timestamp: Date.now() };
  }
}
