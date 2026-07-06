import { expect, test } from "bun:test";
import type { SceneDocument } from "../data-model/scene/types.js";
import { SceneStatus } from "../types/enums.js";
import { ChapterDeductor } from "./chapter-deductor.js";

test("ChapterDeductor.deduce creates 2 chapter candidates from 6 scenes with 2 POV changes", () => {
  const scenes: SceneDocument[] = [
    scene("scene-1", "ada"),
    scene("scene-2", "ada"),
    scene("scene-3", "ada"),
    scene("scene-4", "byron"),
    scene("scene-5", "byron"),
    scene("scene-6", "clio"),
  ];

  const candidates = new ChapterDeductor().deduce(scenes, {});

  expect(candidates).toHaveLength(2);
  expect(candidates[0]?.sceneIds).toEqual(["scene-1", "scene-2", "scene-3"]);
  expect(candidates[1]?.sceneIds).toEqual(["scene-4", "scene-5", "scene-6"]);
  expect(candidates[0]?.breakReason).toContain("POV changes from ada to byron");
});

function scene(id: string, pov: string): SceneDocument {
  return {
    id,
    title: id,
    status: SceneStatus.Draft,
    metadata: {
      pov,
      characters: [pov],
      locations: ["manor"],
      plotThreads: ["mystery"],
      thematicMotifs: ["trust"],
      dramaticQuestions: ["Who lied?"],
    },
    prose: "",
    customFields: {},
  };
}
