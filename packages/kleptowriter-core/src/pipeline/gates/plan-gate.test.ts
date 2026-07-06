import { expect, test } from "bun:test";
import { InMemoryStoryBible } from "../../data-model/bible/index.js";
import type { ScenePlan } from "../../narrative/types.js";
import type { NarrativeStructure } from "../../narrative/templates/types.js";
import { ScenePlanGate } from "./plan-gate.js";

test("ScenePlanGate passes a coherent plan", () => {
  const gate = new ScenePlanGate();
  const bible = makeBible();
  const result = gate.evaluate(
    {
      beatId: "confrontation",
      purpose: "Ada confronts Byron in the archive about the stolen letter",
      suggestedPov: "ada",
      suggestedCharacters: ["ada", "byron"],
      targetTension: 7,
      plotThreads: ["stolen-letter"],
      dramaticQuestions: ["will-ada-expose-byron"],
      thematicMotifs: ["truth"],
    },
    bible,
    makeStructure(),
  );

  expect(result.verdict).toBe("pass");
  expect(result.score).toBeGreaterThanOrEqual(7);
  expect(result.evaluatorReports).toHaveLength(6);
});

test("ScenePlanGate returns conditional for minor plan gaps", () => {
  const gate = new ScenePlanGate();
  const result = gate.evaluate(
    {
      beatId: "confrontation",
      purpose: "A stranger challenges Ada",
      suggestedPov: "ghost",
      suggestedCharacters: ["ghost"],
      plotThreads: ["stolen-letter"],
      dramaticQuestions: ["will-ada-expose-byron"],
      thematicMotifs: [],
    },
    makeBible(),
    makeStructure(),
  );

  expect(result.verdict).toBe("conditional");
  expect(result.score).toBeGreaterThanOrEqual(4);
  expect(result.score).toBeLessThan(7);
});

test("ScenePlanGate rejects blocking plan failures", () => {
  const gate = new ScenePlanGate();
  const alternative: ScenePlan = {
    beatId: "confrontation",
    purpose: "Ada confronts Byron",
    suggestedCharacters: ["ada"],
    targetTension: 6,
    plotThreads: ["stolen-letter"],
    dramaticQuestions: ["will-ada-expose-byron"],
    thematicMotifs: ["truth"],
  };

  const result = gate.evaluate(
    {
      beatId: "",
      purpose: "",
      suggestedPov: "ghost",
      suggestedCharacters: [],
      targetTension: 20,
      plotThreads: [],
      dramaticQuestions: [],
      thematicMotifs: [],
      alternatives: [alternative],
    },
    makeBible(),
    makeStructure(),
  );

  expect(result.verdict).toBe("reject");
  expect(result.score).toBeLessThan(4);
  expect(result.alternatives).toEqual([alternative]);
});

function makeBible(): InMemoryStoryBible {
  const bible = new InMemoryStoryBible();
  bible.applyStateUpdate({
    characters: new Map([
      ["ada", { id: "ada", name: "Ada", aliases: [], tags: ["detective"] }],
      ["byron", { id: "byron", name: "Byron", aliases: [], tags: ["suspect"] }],
    ]),
    locations: new Map([
      ["archive", { id: "archive", name: "Archive", aliases: [], tags: [], description: "A dusty record room" }],
    ]),
    plotThreads: new Map([
      ["stolen-letter", { id: "stolen-letter", name: "Stolen letter", status: "developed" }],
    ]),
  });
  bible.thematicProgression.recordIntensity("truth", "scene-1", 7);
  return bible;
}

function makeStructure(): NarrativeStructure {
  return {
    name: "Test Structure",
    description: "Small fixture",
    beats: [{ id: "confrontation", name: "Confrontation", description: "Face-off", type: "climax", transitions: [] }],
    constraints: [
      {
        type: "tension",
        severity: "blocking",
        description: "Confrontations should be tense.",
        beatId: "confrontation",
        minTension: 5,
        maxTension: 8,
      },
    ],
  };
}
