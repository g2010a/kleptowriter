import { expect, test } from "bun:test";
import { InMemoryStoryBible } from "../data-model/bible/index.js";
import type { SceneDocument } from "../data-model/scene/index.js";
import { SceneStatus } from "../types/index.js";
import { SceneExtractor } from "./extractor.js";

test("SceneExtractor.extract populates scene metadata", () => {
  const bible = new InMemoryStoryBible();
  bible.applyStateUpdate({
    characters: new Map([
      ["ada", { id: "ada", name: "Ada", aliases: ["Detective Vale"], tags: [], traits: {}, relationships: new Map(), knowledge: new Set(), arcBeatIds: [] }],
      ["byron", { id: "byron", name: "Byron", aliases: [], tags: [], traits: {}, relationships: new Map(), knowledge: new Set(), arcBeatIds: [] }],
    ]),
  });
  const scene: SceneDocument = {
    id: "scene-1",
    title: "The Threat",
    status: SceneStatus.Draft,
    metadata: {
      characters: ["byron"],
      locations: ["archive"],
      plotThreads: ["stolen-letter"],
      thematicMotifs: ["truth"],
      dramaticQuestions: ["Will Ada expose Byron?"],
    },
    prose: "I saw Ada enter the archive. Byron looked afraid, desperate, and angry as the threat became urgent.",
    customFields: { chapter: 2, scene: 4 },
  };

  const metadata = new SceneExtractor().extract(scene, bible);

  expect(metadata.pov).toBe("first-person");
  expect(metadata.characters).toEqual(["byron", "ada"]);
  expect(metadata.locations).toEqual(["archive"]);
  expect(metadata.tension).toBeGreaterThan(1);
  expect(metadata.mood).toBe("afraid, angry, desperate, urgent");
  expect(metadata.plotThreads).toEqual(["stolen-letter"]);
  expect(metadata.thematicMotifs).toEqual(["truth"]);
  expect(metadata.dramaticQuestions).toEqual(["Will Ada expose Byron?"]);
});
