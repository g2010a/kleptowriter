import { expect, test, describe } from "bun:test";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import type { LocationState } from "../../../data-model/bible/interfaces.js";
import { createLocalizerEvaluator, type LocalizerContext } from "../localizer.js";

function mockScene(overrides: Partial<SceneDocument> = {}): SceneDocument {
  return {
    id: "scene-1",
    title: "Test Scene",
    status: 1,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: [],
      tension: 5,
      mood: "tense",
      plotThreads: ["thread-1"],
      thematicMotifs: ["theme-1"],
      dramaticQuestions: ["question-1"],
    },
    prose: "The protagonist walked through the ivy-covered stone gateway into the courtyard. The ancient fountain gurgled softly in the center, moss clinging to its weathered basin. Beyond the eastern wall, the market bells chimed.",
    customFields: {},
    ...overrides,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: [],
      tension: 5,
      mood: "tense",
      plotThreads: ["thread-1"],
      thematicMotifs: ["theme-1"],
      dramaticQuestions: ["question-1"],
      ...(overrides.metadata ?? {}),
    },
  };
}

function mockBible(overrides: Partial<StoryBible> = {}): StoryBible {
  return {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    chronology: [],
    thematicProgression: { themes: new Map(), recordIntensity: () => {}, getIntensity: () => 0 },
    plotThreads: new Map(),
    dramaticQuestions: new Map(),
    knowledgeState: { knows: () => false, learn: () => {}, queryFactsByCharacter: () => [], allFacts: () => new Map() },
    arcs: new Map(),
    ...overrides,
  } as StoryBible;
}

function mockLocation(id: string, overrides: Partial<LocationState> = {}): LocationState {
  return {
    id,
    name: "Courtyard",
    aliases: ["yard", "patio"],
    tags: ["outdoor", "urban"],
    description: "A mossy courtyard with an ancient fountain at its center, surrounded by ivy-covered stone walls. The eastern wall has a gateway to the market district.",
    relatedLocations: ["market-district"],
    ...overrides,
  };
}

function mockContext(overrides: Partial<LocalizerContext> = {}): LocalizerContext {
  return {
    targetLocale: "es-ES",
    culturalMarkers: ["siesta", "tapas", "flamenco"],
    idioms: ["dar en el clavo", "ser pan comido"],
    iterationCount: 0,
    ...overrides,
  };
}

// --- Geographic Accuracy ---

test("geographic accuracy: location mentioned in prose passes", () => {
  const loc = mockLocation("courtyard-1");
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The courtyard was quiet at dawn. Ivy crawled up the stone walls.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  expect(result.score).toBeGreaterThanOrEqual(50);
  expect(result.findings.some((f) => f.includes("PASS") && f.includes("Courtyard") && f.includes("mentioned"))).toBe(true);
});

test("geographic accuracy: missing location mention fails", () => {
  const loc = mockLocation("courtyard-1");
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The rain fell steadily. Nothing else happened.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  expect(result.findings.some((f) => f.includes("FAIL") && f.includes("Courtyard"))).toBe(true);
});

test("geographic accuracy: location alias mention passes", () => {
  const loc = mockLocation("courtyard-1", { name: "Grand Plaza", aliases: ["plaza", "town square"] });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The town square was bustling with activity at midday.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  expect(result.findings.some((f) => f.includes("PASS") && f.includes("mentioned"))).toBe(true);
});

test("geographic accuracy: related location referenced passes", () => {
  const market = mockLocation("market-district", { name: "Market District", aliases: ["market"], description: "A bustling market", relatedLocations: [] });
  const loc = mockLocation("courtyard-1", { relatedLocations: ["market-district"] });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "From the courtyard, she could hear the market traders hawking their wares beyond the eastern wall.",
  });
  const bible = mockBible({
    locations: new Map([
      ["courtyard-1", loc],
      ["market-district", market],
    ]),
  });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  expect(result.findings.some((f) => /PASS.*Market/i.test(f))).toBe(true);
});

test("geographic accuracy: description key terms reflected in prose passes", () => {
  const loc = mockLocation("courtyard-1", {
    description: "A mossy courtyard with an ancient fountain made of weathered stone at its center, surrounded by ivy-covered walls",
  });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "She sat by the fountain in the center of the courtyard. Moss covered the weathered stone, and ivy crept along the walls.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  // Should have at least some PASS for description terms matching
  expect(result.findings.some((f) => f.includes("PASS") && f.includes("description"))).toBe(true);
});

test("geographic accuracy: undefined location in metadata flagged", () => {
  const scene = mockScene({
    metadata: { locations: ["unknown-loc"] },
    prose: "Somewhere far away, things were happening.",
  });
  const bible = mockBible({ locations: new Map() });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  expect(result.findings.some((f) => f.includes("FAIL") && f.includes("not defined"))).toBe(true);
});

test("geographic accuracy: no locations in metadata skips geographic checks", () => {
  const scene = mockScene({
    metadata: { locations: [] },
    prose: "Just some prose without location references.",
  });
  const bible = mockBible({ locations: new Map() });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, mockContext());

  // Should only have cultural authenticity checks
  const geoFindings = result.findings.filter((f) => f.includes("Location"));
  expect(geoFindings).toHaveLength(0);
});

// --- Cultural Authenticity ---

test("cultural authenticity: cultural markers present in prose passes", () => {
  const scene = mockScene({
    prose: "After the midday meal, the village settled into the traditional siesta. In the evening, they served tapas at the square, and a group performed flamenco by the fountain.",
  });
  const bible = mockBible();
  const context = mockContext({ culturalMarkers: ["siesta", "tapas", "flamenco"] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.findings.some((f) => f.includes("PASS") && f.includes("cultural"))).toBe(true);
});

test("cultural authenticity: missing cultural markers flagged", () => {
  const scene = mockScene({
    prose: "A normal afternoon in the village. Nothing special happened.",
  });
  const bible = mockBible();
  const context = mockContext({ culturalMarkers: ["siesta", "tapas", "flamenco"] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.findings.some((f) => f.includes("cultural"))).toBe(true);
});

test("cultural authenticity: idioms in dialogue pass", () => {
  const scene = mockScene({
    prose: '"Dar en el clavo," she said with a smile. "Finding the right answer was ser pan comido."',
  });
  const bible = mockBible();
  const context = mockContext({ idioms: ["dar en el clavo", "ser pan comido"] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.findings.some((f) => f.includes("PASS") && f.includes("idiom"))).toBe(true);
});

test("cultural authenticity: idioms in narration also count", () => {
  const scene = mockScene({
    prose: "Finding the solution was ser pan comido for the experienced detective. He had dar en el clavo many times before.",
  });
  const bible = mockBible();
  const context = mockContext({ idioms: ["dar en el clavo", "ser pan comido"] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.findings.some((f) => f.includes("PASS") && f.includes("idiom"))).toBe(true);
});

// --- Score and Verdict ---

test("score is 100 when all checks pass", () => {
  const courtyard = mockLocation("courtyard-1", {
    description: "A mossy courtyard with fountain",
    relatedLocations: [],
  });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The courtyard's fountain sparkled in the sun. Moss clung to the stone. Siesta time brought quiet to the streets as locals served tapas.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", courtyard]]) });
  const context = mockContext({ culturalMarkers: ["siesta", "tapas"], idioms: [] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.score).toBe(100);
  expect(result.verdict).toBe("pass");
});

test("score is 0 when all checks fail", () => {
  const loc = mockLocation("courtyard-1", {
    description: "Tropical oasis with palm trees and exotic birds perched on branches",
    relatedLocations: [],
  });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The office was cold and gray.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const context = mockContext({ culturalMarkers: ["siesta"], idioms: ["dar en el clavo"] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.score).toBe(0);
  expect(result.verdict).toBe("reject");
});

test("score is conditional with mixed pass/fail", () => {
  const loc = mockLocation("courtyard-1", {
    description: "A stone courtyard with a fountain",
    relatedLocations: [],
  });
  const scene = mockScene({
    metadata: { locations: ["courtyard-1"] },
    prose: "The courtyard was quiet. She sat by the fountain.",
  });
  const bible = mockBible({ locations: new Map([["courtyard-1", loc]]) });
  const context = mockContext({ culturalMarkers: ["siesta", "tapas", "flamenco"], idioms: [] });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  // Location mentioned (pass) + description terms (pass) + cultural markers (fail)
  // Score between ~50-79 → conditional
  expect(result.verdict).toBe("conditional");
});

test("iteration count propagated from context", () => {
  const scene = mockScene();
  const bible = mockBible();
  const context = mockContext({ iterationCount: 3 });
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.iterationCount).toBe(3);
});

test("evaluatorId and role are correct", () => {
  const scene = mockScene();
  const bible = mockBible();
  const context = mockContext();
  const evaluator = createLocalizerEvaluator();

  const result = evaluator(scene, bible, context);

  expect(result.evaluatorId).toBe("localizer");
  expect(result.role).toBe("localizer");
});
