import { expect, test } from "bun:test";
import type { SceneDocument } from "../data-model/scene/index.js";
import { SceneStatus } from "../types/index.js";
import { SlidingWindowManager } from "./sliding-window.js";

const scene = (number: number): SceneDocument => ({
  id: `scene-${number}`,
  title: `Scene ${number}`,
  status: SceneStatus.Outline,
  metadata: {
    characters: [],
    locations: [],
    plotThreads: [],
    thematicMotifs: [],
    dramaticQuestions: [],
  },
  prose: "",
  customFields: {},
});

test("keeps the latest scenes and archives earlier entries", () => {
  const manager = new SlidingWindowManager(5);

  for (let index = 1; index <= 10; index += 1) manager.add(scene(index));

  expect(manager.getWindow().map((entry) => entry.scene.title)).toEqual([
    "Scene 6",
    "Scene 7",
    "Scene 8",
    "Scene 9",
    "Scene 10",
  ]);
  expect(manager.getArchived().map((entry) => entry.scene.title)).toEqual([
    "Scene 1",
    "Scene 2",
    "Scene 3",
    "Scene 4",
    "Scene 5",
  ]);
});
