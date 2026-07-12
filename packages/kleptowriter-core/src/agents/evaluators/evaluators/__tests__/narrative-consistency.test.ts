import { expect, test, describe } from "bun:test";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import {
  narrativeConsistencyEvaluator,
  narrativeConsistencyStub,
  type NarrativeConsistencyContext,
} from "../narrative-consistency.js";

function mockScene(overrides?: Partial<SceneDocument>): SceneDocument {
  return {
    id: "scene-current",
    title: "Current Scene",
    status: 1,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["location-1"],
      tension: 5,
      mood: "tense",
      plotThreads: ["thread-main"],
      thematicMotifs: ["theme-1"],
      dramaticQuestions: ["question-1"],
    },
    prose: "The brave protagonist entered the dark room cautiously.",
    customFields: {},
    ...overrides,
  };
}

function mockBible(overrides?: Partial<StoryBible>): StoryBible {
  return {
    characters: new Map([
      [
        "protagonist",
        {
          id: "protagonist",
          name: "protagonist",
          aliases: [],
          tags: ["hero"],
          traits: { bravery: "brave", caution: "cautious" },
          relationships: new Map(),
          knowledge: new Set(),
          arcBeatIds: ["arc-hero"],
          lastSeenScene: "scene-1",
        },
      ],
      [
        "antagonist",
        {
          id: "antagonist",
          name: "antagonist",
          aliases: ["villain"],
          tags: ["villain"],
          traits: { cunning: "cunning", cruelty: "cruel" },
          relationships: new Map(),
          knowledge: new Set(),
          arcBeatIds: ["arc-villain"],
        },
      ],
    ]),
    locations: new Map(),
    items: new Map(),
    thematicProgression: { themes: new Map(), recordIntensity: () => {} },
    plotThreads: new Map([
      ["thread-main", { id: "thread-main", name: "Main Plot", description: "Central conflict", status: "developed", relatedSceneIds: ["scene-1"] }],
      ["thread-side", { id: "thread-side", name: "Side Plot", description: "Subplot", status: "introduced", relatedSceneIds: ["scene-1"] }],
      ["thread-resolved", { id: "thread-resolved", name: "Resolved", description: "Done", status: "resolved", relatedSceneIds: ["scene-0"] }],
    ]),
    knowledgeGraph: { nodes: new Map(), edges: [] },
    arcs: new Map(),
    dramaticQuestions: new Map(),
    ...overrides,
  };
}

function mockPrevScene(plotThreads: string[] = ["thread-main", "thread-side"]): SceneDocument {
  return {
    id: "scene-prev",
    title: "Previous Scene",
    status: 1,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["location-1"],
      tension: 4,
      mood: "tense",
      plotThreads,
      thematicMotifs: [],
      dramaticQuestions: [],
    },
    prose: "Earlier events unfolded.",
    customFields: {},
  };
}

function mockContext(overrides?: Partial<NarrativeConsistencyContext>): NarrativeConsistencyContext {
  return {
    previousScenes: [mockPrevScene()],
    continuityChecks: ["plot-continuity", "characterization"],
    iterationCount: 0,
    ...overrides,
  };
}

// ── Real evaluator tests ───────────────────────────────────────────────

describe("narrativeConsistencyEvaluator", () => {
  describe("plot continuity", () => {
    test("passes when scene continues an open plot thread from previous scenes", () => {
      const scene = mockScene({ metadata: { ...mockScene().metadata, plotThreads: ["thread-main"] } });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.startsWith("PASS") && f.includes("continues"))).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    test("fails when scene ignores all open plot threads from previous scenes", () => {
      const scene = mockScene({ metadata: { ...mockScene().metadata, plotThreads: ["unrelated-thread"] } });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.startsWith("FAIL") && f.includes("does not continue"))).toBe(true);
    });

    test("skips continuity check when no previous scenes exist", () => {
      const scene = mockScene({ metadata: { ...mockScene().metadata, plotThreads: ["thread-main"] } });
      const bible = mockBible();
      const context = mockContext({ previousScenes: [] });

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.includes("No open plot threads from previous scenes"))).toBe(true);
    });

    test("only considers introduced or developed threads as open", () => {
      const prevScene = mockPrevScene(["thread-resolved"]);
      const scene = mockScene({ metadata: { ...mockScene().metadata, plotThreads: ["thread-resolved"] } });
      const bible = mockBible();
      const context = mockContext({ previousScenes: [prevScene] });

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      // thread-resolved is "resolved", not open — no open threads from prev
      expect(result.findings.some((f) => f.includes("No open plot threads"))).toBe(true);
    });
  });

  describe("characterization consistency", () => {
    test("passes when characters have traits reflected in prose", () => {
      const scene = mockScene({
        metadata: { ...mockScene().metadata, characters: ["protagonist"] },
        prose: "The brave protagonist entered cautiously.",
      });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.startsWith("PASS") && f.includes("act consistently"))).toBe(true);
    });

    test("fails when character traits are absent from prose", () => {
      const scene = mockScene({
        metadata: { ...mockScene().metadata, characters: ["antagonist"] },
        prose: "Someone walked into the room.",
      });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.startsWith("FAIL") && f.includes("Characterization"))).toBe(true);
    });

    test("flags unknown characters not in the bible", () => {
      const scene = mockScene({
        metadata: { ...mockScene().metadata, characters: ["protagonist", "unknown-char"] },
      });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.includes("Unknown characters"))).toBe(true);
    });

    test("fails when scene metadata has no characters", () => {
      const scene = mockScene({ metadata: { ...mockScene().metadata, characters: [] } });
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.findings.some((f) => f.includes("lists no characters"))).toBe(true);
    });
  });

  describe("score and verdict", () => {
    test("returns pass verdict for score >= 80", () => {
      const scene = mockScene({
        prose: "The brave antagonist acted cruelly.",
        metadata: {
          ...mockScene().metadata,
          characters: ["antagonist"],
          plotThreads: ["thread-main"],
        },
      });
      const prevScene = mockPrevScene(["thread-main"]);
      const bible = mockBible();
      const context = mockContext({ previousScenes: [prevScene] });

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.verdict).toBe("pass");
    });

    test("returns reject verdict for score < 50", () => {
      const scene = mockScene({
        metadata: { ...mockScene().metadata, characters: [], plotThreads: ["unrelated"] },
      });
      const prevScene = mockPrevScene(["thread-main"]);
      const bible = mockBible();
      const context = mockContext({ previousScenes: [prevScene] });

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.score).toBeLessThan(50);
      expect(result.verdict).toBe("reject");
    });

    test("respects iterationCount from context", () => {
      const scene = mockScene();
      const bible = mockBible();
      const context = mockContext({ iterationCount: 2 });

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.iterationCount).toBe(2);
    });

    test("evaluatorId and role are set correctly", () => {
      const scene = mockScene();
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      expect(result.evaluatorId).toBe("narrative-consistency");
      expect(result.role).toBe("narrative-consistency");
    });

    test("findings are formatted as PASS/FAIL strings", () => {
      const scene = mockScene();
      const bible = mockBible();
      const context = mockContext();

      const result = narrativeConsistencyEvaluator(scene, bible, context);

      for (const finding of result.findings) {
        expect(finding).toMatch(/^(PASS|FAIL): /);
      }
    });
  });
});

// ── Stub backward compatibility ─────────────────────────────────────

describe("narrativeConsistencyStub (backward compat)", () => {
  test("stub delegates to real evaluator", () => {
    const scene = mockScene();
    const bible = mockBible();
    const context = mockContext();

    const stubResult = narrativeConsistencyStub(scene, bible, context);
    const realResult = narrativeConsistencyEvaluator(scene, bible, context);

    expect(stubResult.evaluatorId).toBe("narrative-consistency");
    expect(stubResult.score).toBe(realResult.score);
    expect(stubResult.verdict).toBe(realResult.verdict);
  });
});
