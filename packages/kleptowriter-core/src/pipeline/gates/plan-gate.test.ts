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
  expect(result.evaluatorReports).toHaveLength(11);
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

test("all 11 evaluators are invoked during scene planning", () => {
  const gate = new ScenePlanGate();
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
    makeBible(),
    makeStructure(),
  );

  expect(result.evaluatorReports).toHaveLength(11);

  const evaluatorIds = result.evaluatorReports.map((r) => r.agentId);
  expect(evaluatorIds).toContain("narratologist");
  expect(evaluatorIds).toContain("pacing");
  expect(evaluatorIds).toContain("character");
  expect(evaluatorIds).toContain("thematic");
  expect(evaluatorIds).toContain("worldbuilding");
  expect(evaluatorIds).toContain("mood");
  expect(evaluatorIds).toContain("fact-checker");
  expect(evaluatorIds).toContain("localizer");
  expect(evaluatorIds).toContain("narrative-consistency");
  expect(evaluatorIds).toContain("critic");
  expect(evaluatorIds).toContain("editor");
});

test("well-planned beat receives high scores from all evaluators", () => {
  const gate = new ScenePlanGate();
  const result = gate.evaluate(
    {
      beatId: "confrontation",
      purpose: "Ada confronts Byron in the dusty archive about the stolen letter that implicates them both",
      suggestedPov: "ada",
      suggestedCharacters: ["ada", "byron"],
      targetTension: 7,
      plotThreads: ["stolen-letter"],
      dramaticQuestions: ["will-ada-expose-byron"],
      thematicMotifs: ["truth"],
      alternatives: [
        {
          beatId: "confrontation",
          purpose: "Byron flees when Ada arrives",
          suggestedCharacters: ["ada", "byron"],
          targetTension: 6,
          plotThreads: ["stolen-letter"],
          dramaticQuestions: ["will-ada-expose-byron"],
          thematicMotifs: ["truth"],
        },
      ],
    },
    makeBible(),
    makeStructure(),
  );

  expect(result.verdict).toBe("pass");
  expect(result.score).toBeGreaterThanOrEqual(7);

  for (const report of result.evaluatorReports) {
    expect(report.confidence).toBeGreaterThanOrEqual(0.6);
  }
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
