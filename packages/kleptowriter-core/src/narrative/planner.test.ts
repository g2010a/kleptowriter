import { expect, test } from "bun:test";
import { InMemoryStoryBible } from "../data-model/bible/index.js";
import { ScenePlanner } from "./planner.js";

test("ScenePlanner.enrich produces valid ScenePlan", () => {
  const bible = new InMemoryStoryBible();
  bible.applyStateUpdate({
    characters: new Map([
      ["detective", { id: "detective", name: "Ada", aliases: [], tags: ["detective"] }],
    ]),
    plotThreads: new Map([
      ["main-mystery", { id: "main-mystery", name: "Main mystery", status: "introduced" }],
    ]),
  });

  const planner = new ScenePlanner();
  const plan = planner.enrich("introduce the detective", bible, {
    currentSceneIndex: 0,
    completedBeats: [],
    activePlotThreads: [],
  });

  expect(plan.purpose).toBe("introduce the detective");
  expect(plan.suggestedPov).toBe("detective");
  expect(Array.isArray(plan.suggestedCharacters)).toBe(true);
  expect(Array.isArray(plan.plotThreads)).toBe(true);
});

test("generateAlternatives returns N distinct plans", () => {
  const bible = new InMemoryStoryBible();
  bible.applyStateUpdate({
    characters: new Map([
      ["detective", { id: "detective", name: "Ada", aliases: [], tags: ["detective"] }],
      ["suspect", { id: "suspect", name: "Byron", aliases: [], tags: ["suspect"] }],
    ]),
    plotThreads: new Map([
      ["main-mystery", { id: "main-mystery", name: "Main mystery", status: "developed" }],
    ]),
  });

  const planner = new ScenePlanner();
  const alternatives = planner.generateAlternatives(
    "climax confrontation",
    bible,
    {
      currentSceneIndex: 10,
      completedBeats: ["setup", "rising-action"],
      activePlotThreads: ["main-mystery"],
    },
    3,
  );

  expect(alternatives).toHaveLength(3);
  expect(new Set(alternatives.map((alternative) => alternative.purpose)).size).toBe(3);
});
