import { expect, test, describe } from "bun:test";
import type { SceneDocument } from "../../../../data-model/scene/types.js";
import type { StoryBible } from "../../../../data-model/bible/interfaces.js";
import { createEditorEvaluator, type EditorContext } from "../editor.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockBible(): StoryBible {
  return {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    thematicProgression: { themes: new Map(), recordIntensity: () => {} },
    plotThreads: new Map(),
    knowledgeGraph: { nodes: new Map(), edges: [] },
    arcs: new Map(),
  } as StoryBible;
}

function mockContext(overrides: Partial<EditorContext> = {}): EditorContext {
  return {
    editPasses: ["line-edit", "copy-edit"],
    styleGuide: ["Use active voice", "Avoid clichés"],
    iterationCount: 0,
    ...overrides,
  };
}

function makeScene(prose: string, overrides: Partial<SceneDocument> = {}): SceneDocument {
  return {
    id: "scene-1",
    title: "Test Scene",
    status: 1,
    metadata: {
      pov: "protagonist",
      characters: ["protagonist"],
      locations: ["location-1"],
      tension: 5,
      mood: "tense",
      plotThreads: ["thread-1"],
      thematicMotifs: ["theme-1"],
      dramaticQuestions: ["question-1"],
    },
    prose,
    customFields: {},
    ...overrides,
  };
}

// ─── Rich prose (should score well on both dimensions) ────────────────────────

const richProse = [
  // Sentences with good variety
  "The old house groaned.",
  "Every floorboard beneath her feet told a story of decay and forgotten memories.",
  "Rain hammered the windows.",
  "She paused, listening — not for the storm, but for something far more unsettling.",
  "A creak echoed from the hallway upstairs.",
  // Dialogue with varied tags
  "\"Is someone there?\" she whispered.",
  "\"Just the wind,\" he said, though his eyes told a different story.",
  "\"The wind doesn't walk,\" she countered, her voice trembling.",
  "\"Then what do you suggest?\" he snapped.",
  "\"We check,\" she breathed. \"Together.\"",
  // Short final sentence for variety
  "He nodded.",
].join("\n");

const flatProse = [
  "The cat sat on the mat.",
  "The bird flew in the sky.",
  "The fish swam in the pond.",
  "The sun shone very very very brightly.",
  "The day was really really really calm and quite quite quite nice.",
  "Just just just standing there, it was actually actually actually nice.",
].join(" ");

const passiveHeavyProse = [
  "The decision was decided by the committee.",
  "The cake was baked by Mary.",
  "The rules were established by the elders.",
  "The song was performed by the choir.",
  "The letter was drafted by John.",
  "The game was claimed by the home team.",
  "The report was reviewed by the manager.",
  "The house was constructed in 1920.",
  "The window was shattered by a falling branch.",
  "The treasure was located by the pirates.",
].join(" ");

const dialogueOnlySaidProse = [
  "\"Hello,\" he said.",
  "\"Hi,\" she said.",
  "\"How are you?\" he said.",
  "\"Fine,\" she said.",
  "\"Good,\" he said.",
  "\"Yes,\" she said.",
].join("\n");

const expositionDialogueProse = [
  "\"As you know, we've been married for ten years,\" she said.",
  "\"You recall that we adopted our daughter from Seoul,\" he replied.",
  "\"And as you remember, the doctor said she needs surgery,\" she continued.",
  "\"You already know I'll do anything for her,\" he said.",
  "\"As I told you before, the funds are tight,\" she whispered.",
].join("\n");

// ─── Tests ────────────────────────────────────────────────────────────────────

const editor = createEditorEvaluator();

describe("editor evaluator", () => {
  test("evaluates rich prose with high scores", () => {
    const scene = makeScene(richProse);
    const result = editor(scene, mockBible(), mockContext());

    expect(result.evaluatorId).toBe("editor");
    expect(result.role).toBe("editor");
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.iterationCount).toBe(0);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  test("propagates iteration count from context", () => {
    const scene = makeScene(richProse);
    const result = editor(scene, mockBible(), mockContext({ iterationCount: 5 }));

    expect(result.iterationCount).toBe(5);
  });

  test("handles empty prose gracefully", () => {
    const scene = makeScene("");
    const result = editor(scene, mockBible(), mockContext());

    expect(result.score).toBe(25); // 0 prose-quality + 50 dialogue / 2
    expect(result.verdict).toBe("reject");
  });

  test("handles prose with only whitespace", () => {
    const scene = makeScene("   \n\n  ");
    const result = editor(scene, mockBible(), mockContext());

    expect(result.score).toBe(25);
    expect(result.verdict).toBe("reject");
  });

  describe("prose quality dimension", () => {
    test("detects low sentence variety", () => {
      const scene = makeScene(flatProse);
      const result = editor(scene, mockBible(), mockContext());

      const proseFindings = result.findings.filter(f => f.category === "prose-quality");
      const varietyWarning = proseFindings.find(f => f.message.includes("sentence length variety"));

      expect(varietyWarning).toBeDefined();
      expect(varietyWarning!.severity).toBe("warning");
    });

    test("detects high passive voice usage", () => {
      const scene = makeScene(passiveHeavyProse);
      const result = editor(scene, mockBible(), mockContext());

      const passiveFinding = result.findings.find(f => f.message.includes("passive voice"));

      expect(passiveFinding).toBeDefined();
      expect(passiveFinding!.severity).toBe("warning");
    });

    test("detects overused filler words", () => {
      const scene = makeScene(flatProse); // "very", "really", "quite" in flatProse
      const result = editor(scene, mockBible(), mockContext());

      const fillerFinding = result.findings.find(f => f.message.includes("Overused filler"));

      expect(fillerFinding).toBeDefined();
      expect(fillerFinding!.severity).toBe("warning");
    });
  });

  describe("dialogue naturalism dimension", () => {
    test("detects no dialogue and assigns neutral score", () => {
      const scene = makeScene("This is a scene with absolutely no dialogue whatsoever. No quotes anywhere to be found.");
      const result = editor(scene, mockBible(), mockContext());

      const noDialogue = result.findings.find(f => f.message.includes("No dialogue found"));

      expect(noDialogue).toBeDefined();
    });

    test("detects lack of dialogue tag variety", () => {
      const scene = makeScene(dialogueOnlySaidProse);
      const result = editor(scene, mockBible(), mockContext());

      const tagFinding = result.findings.find(f => f.message.includes("Dialogue tags lack variety"));

      expect(tagFinding).toBeDefined();
      expect(tagFinding!.severity).toBe("warning");
    });

    test("detects exposition-in-dialogue patterns", () => {
      const scene = makeScene(expositionDialogueProse);
      const result = editor(scene, mockBible(), mockContext());

      const expoFinding = result.findings.find(f => f.message.includes("exposition-in-dialogue"));

      expect(expoFinding).toBeDefined();
      expect(expoFinding!.severity).toBe("warning");
    });
  });
});
