import { expect, test } from "bun:test";
import { InMemoryStoryBible } from "../data-model/bible/index.js";
import { BibleUpdateProtocol } from "./bible-update.js";

test("state update merges changed character fields and increments version", () => {
  const bible = new InMemoryStoryBible();
  bible.applyStateUpdate({
    characters: new Map([
      [
        "ada",
        {
          id: "ada",
          name: "Ada",
          aliases: [],
          tags: ["detective"],
          traits: { mood: "focused" },
          relationships: new Map(),
          knowledge: new Set(),
          arcBeatIds: [],
        },
      ],
    ]),
  });

  const protocol = new BibleUpdateProtocol(bible);
  const result = protocol.applyUpdate({
    timestamp: 1,
    agentId: "writer",
    changes: {
      characters: new Map([
        ["ada", { traits: { mood: "worried" }, lastSeenScene: "scene-2" }],
      ]),
    },
  });

  expect(result).toEqual({
    applied: true,
    previousVersion: 1,
    newVersion: 2,
    changedEntities: ["characters.ada"],
    conflicts: [],
  });
  expect(bible.getCharacter("ada")).toMatchObject({
    id: "ada",
    name: "Ada",
    traits: { mood: "worried" },
    lastSeenScene: "scene-2",
  });
});
