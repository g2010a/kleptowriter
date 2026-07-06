import { expect, test } from "bun:test";
import type { SceneMetadata } from "../data-model/scene/index.js";
import { MetadataDiff } from "./metadata-diff.js";

test("MetadataDiff.diff flags characters added in the current scene", () => {
  const previous = metadata({ characters: ["A"] });
  const current = metadata({ characters: ["A", "B"] });

  expect(new MetadataDiff().diff(previous, current).newCharacters).toEqual(["B"]);
});

function metadata(overrides: Partial<SceneMetadata>): SceneMetadata {
  return {
    characters: [],
    locations: [],
    plotThreads: [],
    thematicMotifs: [],
    dramaticQuestions: [],
    ...overrides,
  };
}
