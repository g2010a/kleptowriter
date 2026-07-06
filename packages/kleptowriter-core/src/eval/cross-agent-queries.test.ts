import { expect, test } from "bun:test";
import type { StoryBible } from "../data-model/bible/interfaces.js";
import { CrossAgentQueryRouter, type CrossQuery } from "./cross-agent-queries.js";

test("CrossAgentQueryRouter returns character state", () => {
  const bible = storyBible();
  const ada = {
    id: "ada",
    name: "Ada",
    aliases: ["Countess"],
    tags: ["protagonist"],
    traits: { focus: "analytical" },
    relationships: new Map<string, string>(),
    knowledge: new Set<string>(),
    arcBeatIds: [],
  };
  bible.characters.set("ada", ada);

  const result = new CrossAgentQueryRouter(bible).execute(query("character-state", { characterId: "ada" }));

  expect(result.success).toBe(true);
  expect(result.data).toBe(ada);
});

test("CrossAgentQueryRouter returns an error for an unknown query type", () => {
  const result = new CrossAgentQueryRouter(storyBible()).execute(
    query("not-a-query" as CrossQuery["type"], {}),
  );

  expect(result.success).toBe(false);
  expect(result.error).toBe("Unknown query type: not-a-query");
});

function query(type: CrossQuery["type"], params: Record<string, unknown>): CrossQuery {
  return {
    queryId: "query-1",
    fromAgent: "agent-a",
    toAgent: "agent-b",
    type,
    params,
    timestamp: 1710000000000,
  };
}

function storyBible(): StoryBible {
  return {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    chronology: [],
    arcs: new Map(),
    plotThreads: new Map(),
    dramaticQuestions: new Map(),
    knowledgeState: {
      knows: () => false,
      learn: () => undefined,
      queryFactsByCharacter: () => [],
      allFacts: () => new Map(),
    },
    thematicProgression: {
      themes: new Map(),
      getIntensity: () => 0,
      recordIntensity: () => undefined,
    },
  };
}
