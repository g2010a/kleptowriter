import { expect, test } from "bun:test";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import { factChecker, type FactCheckerContext } from "../fact-checker.js";

function mockScene(overrides?: Partial<SceneDocument>): SceneDocument {
  return {
    id: "scene-1",
    title: "Test Scene",
    status: 1,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["location-1"],
      tension: 5,
      mood: "neutral",
      plotThreads: [],
      thematicMotifs: [],
      dramaticQuestions: [],
    },
    prose: "Alex walked through the plaza. The morning light cast long shadows across the square.",
    customFields: {},
    ...overrides,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["location-1"],
      tension: 5,
      mood: "neutral",
      plotThreads: [],
      thematicMotifs: [],
      dramaticQuestions: [],
      ...(overrides?.metadata ?? {}),
    },
  };
}

function mockBible(overrides?: Partial<StoryBible>): StoryBible {
  const characters = new Map();
  characters.set("protagonist", {
    id: "protagonist",
    name: "Alex",
    aliases: [],
    tags: ["protagonist"],
    traits: { age: "30", occupation: "detective" },
    relationships: new Map(),
    knowledge: new Set(),
    arcBeatIds: [],
  });

  const locations = new Map();
  locations.set("location-1", {
    id: "location-1",
    name: "City Square",
    aliases: ["plaza", "square"],
    tags: ["urban"],
    description: "A bustling town square.",
    relatedLocations: [],
  });

  const items = new Map();

  return {
    characters,
    locations,
    items,
    thematicProgression: { themes: new Map(), recordIntensity: () => {}, getIntensity: () => 0 },
    plotThreads: new Map(),
    knowledgeGraph: { knows: () => false, learn: () => {}, queryFactsByCharacter: () => [], allFacts: () => new Map() },
    arcs: new Map(),
    chronology: [],
    dramaticQuestions: new Map(),
    ...overrides,
  };
}

function mockContext(overrides?: Partial<FactCheckerContext>): FactCheckerContext {
  return {
    claims: [],
    references: [],
    iterationCount: 0,
    ...overrides,
  };
}

test("returns pass with score 100 for scene consistent with Bible facts", () => {
  const scene = mockScene();
  const bible = mockBible();
  const context = mockContext();

  const result = factChecker(scene, bible, context);

  expect(result.evaluatorId).toBe("fact-checker");
  expect(result.role).toBe("fact-checker");
  expect(result.score).toBe(100);
  expect(result.verdict).toBe("pass");
  expect(result.iterationCount).toBe(0);
});

test("returns low score for scene contradicting Bible facts", () => {
  // Scene references a character and location unknown to the Bible
  const scene = mockScene({
    metadata: {
      pov: "hero",
      characters: ["hero", "ghost-char"],
      locations: ["phantom-place"],
    },
    prose: "The hero ventured into the unknown.",
  });
  // Bible only knows about "protagonist" — "ghost-char" and "phantom-place" are unknown
  const bible = mockBible();
  const context = mockContext();

  const result = factChecker(scene, bible, context);

  // checks: hero? has(bible) → no (protagonist exists, not hero) → FAIL
  //         ghost-char? has(bible) → no → FAIL
  //         phantom-place? has(bible) → no → FAIL
  //         hero mention → skipped (not in bible)
  //         ghost-char mention → skipped (not in bible)
  //         phantom-place mention → skipped (not in bible)
  // total=3, passed=0, score=0
  expect(result.score).toBeLessThan(80);
  expect(result.verdict).toBe("reject");

  // Should have findings for each contradiction
  const blockingFindings = result.findings.filter((f) => f.severity === "blocking");
  expect(blockingFindings.length).toBeGreaterThanOrEqual(2);
  expect(blockingFindings.some((f) => f.message.includes("ghost-char"))).toBe(true);
  expect(blockingFindings.some((f) => f.message.includes("phantom-place"))).toBe(true);
});

test("respects iteration count from context", () => {
  const scene = mockScene();
  const bible = mockBible();
  const context = mockContext({ iterationCount: 3 });

  const result = factChecker(scene, bible, context);

  expect(result.iterationCount).toBe(3);
});

test("findings have correct EvaluationFinding shape", () => {
  const scene = mockScene({
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["unknown-loc"],
    },
    prose: "Alex stood alone.",
  });
  const bible = mockBible();
  const context = mockContext();

  const result = factChecker(scene, bible, context);

  for (const finding of result.findings) {
    expect(finding).toHaveProperty("category");
    expect(finding).toHaveProperty("severity");
    expect(["blocking", "warning", "info"]).toContain(finding.severity);
    expect(finding).toHaveProperty("message");
    expect(typeof finding.message).toBe("string");
    expect(finding.message.length).toBeGreaterThan(0);
  }
});

test("verdict is conditional for partially consistent scene", () => {
  // Character exists but not mentioned in prose → half pass
  const scene = mockScene({
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: [],
    },
    prose: "Something entirely unrelated happened in the story.",
  });
  const bible = mockBible();
  const context = mockContext();

  const result = factChecker(scene, bible, context);

  // checks: protagonist existence → PASS
  //         protagonist mention → FAIL (not in prose)
  // total=2, passed=1, score=50
  expect(result.score).toBe(50);
  expect(result.verdict).toBe("conditional");
});
