import { expect, test, describe } from "bun:test";
import type { SceneDocument } from "../../../data-model/scene/types.js";
import type { StoryBible } from "../../../data-model/bible/interfaces.js";
import {
  criticEvaluator,
  type CriticContext,
  type CriticFinding,
  type CriticEvaluation,
} from "../critic.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockScene(overrides?: Partial<SceneDocument> & { prose?: string }): SceneDocument {
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
    prose: overrides?.prose ?? "Test prose content.",
    customFields: {},
    ...overrides,
  };
}

function mockBible(): StoryBible {
  return {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    thematicProgression: { themes: new Map(), recordIntensity: () => {} },
    plotThreads: new Map(),
    knowledgeGraph: { nodes: new Map(), edges: [] },
    arcs: new Map(),
  } as unknown as StoryBible;
}

function mockContext(overrides?: Partial<CriticContext>): CriticContext {
  return {
    critiqueAreas: ["pacing", "structure"],
    severityThreshold: 0,
    iterationCount: 0,
    ...overrides,
  };
}

// ─── Test scenes ──────────────────────────────────────────────────────────────

// ~200 words, 5 paragraphs, moderate dialogue (~12%), avg sentence ~12 words
const WELL_PACED_PROSE = [
  "The courtroom was silent when Ada entered. She took her seat at the defense table and arranged her notes. The judge stared down at her with cold, impartial eyes that seemed to pierce through every excuse she had carefully prepared.",
  "",
  "\"The prosecution calls its first witness,\" the bailiff announced. Ada watched the man approach, his boots heavy on the wooden floor. She had studied his testimony, but seeing him in person changed everything. However, she knew the truth was on her side and that gave her strength.",
  "",
  "But the witness's statement was unexpected. \"I saw her at the scene,\" he declared, his finger pointing at Ada's client. The courtroom erupted in whispers. Ada stood up slowly, her heart pounding against her ribs while she steadied her breathing.",
  "",
  "\"You testified it was dark,\" Ada said, her voice calm and steady. \"How could you be certain of what you saw?\" The witness hesitated, and Ada pressed forward without giving him time to recover. Each question peeled away another layer of doubt from his testimony.",
  "",
  "Finally, the jury returned after three hours of deliberation. Ada held her breath as the foreman unfolded the paper. \"Not guilty,\" he read, and relief flooded through her. The nightmare was finally over and she could breathe again.",
].join("\n");

// ~130 words, ~75% dialogue — triggers high-dialogue warning
const DIALOGUE_HEAVY_PROSE = [
  "\"I cannot believe you did that,\" Ada said, her voice trembling with anger. \"After everything we have been through, you choose now to betray me?\"",
  "",
  "\"Betray you?\" Mira laughed bitterly. \"I saved your life. You would be dead right now if I had not intervened when I did.\"",
  "",
  "\"You call this saving?\" Ada gestured at the wreckage around them. \"You burned down the only lead we had. How is that helping anyone? Tell me that.\"",
  "",
  "\"There was no other choice,\" Mira insisted. \"They were closing in fast. It was either the building or us and I chose us.\"",
  "",
  "\"Fine!\" Ada threw up her hands in frustration. \"But from now on we do things my way. Do you understand me? Agreed?\"",
  "",
  "\"Agreed,\" Mira nodded slowly. \"For now.\"",
].join("\n");

const SINGLE_PARA_PROSE = "Ada walked into the room and looked around. She saw the book on the table and picked it up. It was old and dusty, but she opened it anyway and began to read the first page.";

// ~170 words, 3 paragraphs, no dialogue
const NO_DIALOGUE_LONG_PROSE = [
  "The landscape stretched endlessly before them, a vast expanse of golden plains that seemed to go on forever. Mountains rose in the distance, their peaks capped with fresh snow that caught the morning light and sparkled like scattered diamonds across the horizon.",
  "",
  "The river cut through the valley below, carving a winding path through ancient rock that had stood for millennia. The sound of rushing water filled the crisp air, a constant reminder of nature's patient power. Birds circled overhead, riding thermal currents with effortless grace and silent precision.",
  "",
  "By evening the travelers had made camp on a small rise overlooking the valley. The fire crackled and popped as the stars emerged one by one across the darkening sky. It had been a long and exhausting day but the destination was finally within reach at last.",
].join("\n");

// ~16 words, 2 paragraphs, no dialogue — score should be conditional (~0.41)
const MARGINAL_PROSE = "Ada walked into the room. She looked around carefully.\n\nThe book was on the table. She picked it up.";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CriticEvaluator", () => {
  test("returns evaluator metadata correctly", () => {
    const result = criticEvaluator(mockScene(), mockBible(), mockContext());
    expect(result.evaluatorId).toBe("critic-evaluator");
    expect(result.role).toBe("critic");
  });

  test("respects iteration count from context", () => {
    const result = criticEvaluator(mockScene(), mockBible(), mockContext({ iterationCount: 4 }));
    expect(result.iterationCount).toBe(4);
  });

  test("returns scores in 0-1 range", () => {
    const result = criticEvaluator(mockScene(), mockBible(), mockContext());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  test("verdict is one of pass, conditional, reject", () => {
    const result = criticEvaluator(mockScene(), mockBible(), mockContext());
    expect(["pass", "conditional", "reject"]).toContain(result.verdict);
  });
});

describe("Pacing analysis", () => {
  test("flags empty prose as critical", () => {
    const result = criticEvaluator(mockScene({ prose: "" }), mockBible(), mockContext());
    expect(result.findings).toHaveLength(2); // one for pacing, one for structure
    const pacingFindings = result.findings.filter((f) => f.category === "pacing");
    expect(pacingFindings[0]?.severity).toBe("critical");
    expect(pacingFindings[0]?.message.toLowerCase()).toContain("no prose");
  });

  test("well-paced prose receives no pacing warnings", () => {
    const result = criticEvaluator(mockScene({ prose: WELL_PACED_PROSE }), mockBible(), mockContext());
    const pacingFindings = result.findings.filter((f) => f.category === "pacing");
    const hasWarnings = pacingFindings.some((f) => f.severity === "warning");
    expect(hasWarnings).toBe(false);
  });

  test("dialogue-heavy prose receives a pacing warning", () => {
    const result = criticEvaluator(mockScene({ prose: DIALOGUE_HEAVY_PROSE }), mockBible(), mockContext());
    const pacingFindings = result.findings.filter((f) => f.category === "pacing");
    expect(pacingFindings.length).toBeGreaterThanOrEqual(1);
    const highDialogue = pacingFindings.find((f) => f.message.includes("Dialogue accounts for"));
    expect(highDialogue).toBeDefined();
  });

  test("very short scene receives a pacing warning", () => {
    const result = criticEvaluator(mockScene({ prose: "Short." }), mockBible(), mockContext());
    const pacingFindings = result.findings.filter((f) => f.category === "pacing");
    const shortWarning = pacingFindings.find((f) => f.message.includes("Very short scene"));
    expect(shortWarning).toBeDefined();
  });

  test("low-dialogue long scene receives a warning", () => {
    const prose = Array.from({ length: 8 }, () =>
      "Narrative description without any dialogue continues for many words to test the low dialogue detection threshold. The scene describes the environment in great detail, every corner of the room, every shadow on the wall, every creak of the floorboards. This is purely exposition without character interaction of any kind.",
    ).join(" ");
    const result = criticEvaluator(mockScene({ prose }), mockBible(), mockContext());
    const pacingFindings = result.findings.filter((f) => f.category === "pacing");
    const lowDialogue = pacingFindings.find((f) => f.message.includes("Dialogue accounts for only"));
    expect(lowDialogue).toBeDefined();
  });
});

describe("Structure analysis", () => {
  test("flags empty prose as critical for structure", () => {
    const result = criticEvaluator(mockScene({ prose: "" }), mockBible(), mockContext());
    const structFindings = result.findings.filter((f) => f.category === "structure");
    expect(structFindings[0]?.severity).toBe("critical");
    expect(structFindings[0]?.message.toLowerCase()).toContain("no prose content");
  });

  test("well-structured scene gets positive structural feedback", () => {
    const result = criticEvaluator(mockScene({ prose: WELL_PACED_PROSE }), mockBible(), mockContext());
    const structFindings = result.findings.filter((f) => f.category === "structure");
    const positiveFeedback = structFindings.find(
      (f) => f.severity === "info" && f.message.includes("strong structural development"),
    );
    expect(positiveFeedback).toBeDefined();
  });

  test("single-paragraph scene gets structure warning", () => {
    const result = criticEvaluator(mockScene({ prose: SINGLE_PARA_PROSE }), mockBible(), mockContext());
    const structFindings = result.findings.filter((f) => f.category === "structure");
    const paraWarning = structFindings.find((f) => f.message.includes("only 1 paragraph"));
    expect(paraWarning).toBeDefined();
    expect(paraWarning?.severity).toBe("warning");
  });

  test("dialogue presence is detected as structural element", () => {
    const result = criticEvaluator(
      mockScene({ prose: "\"Hello,\" she said.\n\n\"Goodbye,\" he replied.\n\nThey parted ways." }),
      mockBible(),
      mockContext(),
    );
    const structFindings = result.findings.filter((f) => f.category === "structure");
    const noDialogue = structFindings.find((f) => f.message.includes("No dialogue detected"));
    expect(noDialogue).toBeUndefined();
  });

  test("scene with no dialogue and sufficient content warns about missing dialogue", () => {
    const result = criticEvaluator(mockScene({ prose: NO_DIALOGUE_LONG_PROSE }), mockBible(), mockContext());
    const structFindings = result.findings.filter((f) => f.category === "structure");
    const noDialogue = structFindings.find((f) => f.message.includes("No dialogue detected"));
    expect(noDialogue).toBeDefined();
  });
});

describe("Filtered critique areas", () => {
  test("only runs pacing check when critiqueAreas is ['pacing']", () => {
    const result = criticEvaluator(
      mockScene({ prose: DIALOGUE_HEAVY_PROSE }),
      mockBible(),
      mockContext({ critiqueAreas: ["pacing"] }),
    );
    const categories = result.findings.map((f) => f.category);
    expect(categories.every((c) => c === "pacing")).toBe(true);
  });

  test("only runs structure check when critiqueAreas is ['structure']", () => {
    const result = criticEvaluator(
      mockScene({ prose: SINGLE_PARA_PROSE }),
      mockBible(),
      mockContext({ critiqueAreas: ["structure"] }),
    );
    const categories = result.findings.map((f) => f.category);
    expect(categories.every((c) => c === "structure")).toBe(true);
  });

  test("runs both checks when critiqueAreas is empty", () => {
    const result = criticEvaluator(
      mockScene({ prose: SINGLE_PARA_PROSE }),
      mockBible(),
      mockContext({ critiqueAreas: [] }),
    );
    const categories = new Set(result.findings.map((f) => f.category));
    expect(categories.has("pacing")).toBe(true);
    expect(categories.has("structure")).toBe(true);
  });
});

describe("Scoring and verdict", () => {
  test("well-written scene gets pass verdict", () => {
    const result = criticEvaluator(mockScene({ prose: WELL_PACED_PROSE }), mockBible(), mockContext());
    expect(result.verdict).toBe("pass");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  test("empty prose gets reject verdict", () => {
    const result = criticEvaluator(mockScene({ prose: "" }), mockBible(), mockContext());
    expect(result.verdict).toBe("reject");
    expect(result.score).toBeLessThan(0.4);
  });

  test("marginal prose gets conditional verdict", () => {
    const result = criticEvaluator(mockScene({ prose: MARGINAL_PROSE }), mockBible(), mockContext());
    expect(result.verdict).toBe("conditional");
    const s = result.score;
    expect(s).toBeGreaterThanOrEqual(0.4);
    expect(s).toBeLessThan(0.7);
  });

  test("findings array contains CriticFinding-shaped objects", () => {
    const result = criticEvaluator(mockScene({ prose: WELL_PACED_PROSE }), mockBible(), mockContext());
    for (const f of result.findings) {
      expect(typeof f.category).toBe("string");
      expect(["info", "warning", "critical"]).toContain(f.severity);
      expect(typeof f.message).toBe("string");
    }
  });
});
