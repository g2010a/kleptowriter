import { expect, test } from "bun:test";
import type { SceneDocument } from "../data-model/scene/index.js";
import { SceneStatus } from "../types/index.js";
import { SceneDatastore } from "./datastore.js";

test("SceneDatastore queries scenes by POV", () => {
  const datastore = new SceneDatastore();

  datastore.store(scene("scene-1", "ada"));
  datastore.store(scene("scene-2", "byron"));
  datastore.store(scene("scene-3", "ada"));

  expect(datastore.query({ pov: "ada" }).map((storedScene) => storedScene.id)).toEqual(["scene-1", "scene-3"]);
});

function scene(id: string, pov: string): SceneDocument {
  return {
    id,
    title: id,
    status: SceneStatus.Outline,
    metadata: {
      pov,
      characters: [pov],
      locations: ["library"],
      chronology: "2026-01-01T00:00:00.000Z",
      tension: 0.5,
      plotThreads: ["main"],
      thematicMotifs: [],
      dramaticQuestions: [],
    },
    prose: "",
    customFields: {},
  };
}
