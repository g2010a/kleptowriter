import { expect, test } from "bun:test";
import type { SceneDocument } from "../data-model/scene/index.js";
import { SceneStatus } from "../types/index.js";
import { TieredMemory } from "./tiered-memory.js";

test("demoted hot scene is queryable from cold memory", () => {
  const memory = new TieredMemory();
  const scene: SceneDocument = {
    id: "scene-1",
    title: "Opening",
    status: SceneStatus.Draft,
    metadata: {
      characters: [],
      locations: [],
      plotThreads: ["missing-key"],
      thematicMotifs: [],
      dramaticQuestions: [],
    },
    prose: "The key was gone.",
    customFields: {},
  };

  memory.setCurrentScene(scene);

  expect(memory.query("hot", scene.id)).toBe(scene);

  memory.demote(scene.id);

  expect(memory.query("hot", scene.id)).toBeUndefined();
  expect(memory.query("cold", scene.id)).toBe(scene.id);
});
