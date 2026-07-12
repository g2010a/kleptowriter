import { expect, test } from "bun:test";
import { InMemoryStoryBible } from "../../data-model/bible/index.js";
import type { SceneDocument } from "../../data-model/scene/index.js";
import { SceneStatus } from "../../types/index.js";
import { SceneProseGate } from "./prose-gate.js";

test("scene prose gate passes complete prose and aggregates evaluator reports", () => {
  const gate = new SceneProseGate();
  const result = gate.evaluate(goodScene(), bible());

  expect(result.verdict).toBe("pass");
  expect(result.evaluatorReports).toHaveLength(13);
  expect(result.score).toBeGreaterThanOrEqual(80);
  expect(result.evaluatorReports.map((report) => report.agentId)).toEqual([
    "prose-narratologist",
    "prose-pacing-analyst",
    "prose-character-consistency",
    "prose-thematic-coherence",
    "prose-worldbuilding",
    "prose-dialogist",
    "prose-stylesheet",
    "prose-mood-tension-curator",
    "prose-fact-checker",
    "prose-localizer",
    "prose-narrative-consistency",
    "prose-critic",
    "prose-editor",
  ]);
});

test("scene prose gate rejects thin prose and escalates after max revisions", () => {
  const gate = new SceneProseGate();
  const result = gate.evaluate({ ...goodScene(), prose: "Ada waits." }, bible(), 5);

  expect(result.verdict).toBe("reject");
  expect(result.message).toContain("maximum revision");
  expect(gate.getRemainingRevisions(5)).toBe(0);
  expect(gate.isEscalated(5)).toBe(true);
});

test("scene prose gate reports conditional evaluator findings", () => {
  const scene = goodScene();
  const result = new SceneProseGate().evaluate({ ...scene, metadata: { ...scene.metadata, characters: ["ada", "missing"] } }, bible());
  const characterReport = result.evaluatorReports.find((report) => report.agentId === "prose-character-consistency");

  expect(characterReport?.verdict).not.toBe("pass");
  expect(characterReport?.findings.join("\n")).toContain("missing");
});

test("scene prose gate invokes all 13 evaluators", () => {
  const gate = new SceneProseGate();
  const result = gate.evaluate(goodScene(), bible());

  expect(result.evaluatorReports).toHaveLength(13);

  const agentIds = result.evaluatorReports.map((r) => r.agentId);
  expect(agentIds).toContain("prose-fact-checker");
  expect(agentIds).toContain("prose-localizer");
  expect(agentIds).toContain("prose-narrative-consistency");
  expect(agentIds).toContain("prose-critic");
  expect(agentIds).toContain("prose-editor");
});

test("scene prose gate aggregate score includes contributions from new evaluators", () => {
  const gate = new SceneProseGate();
  const result = gate.evaluate(goodScene(), bible());

  const scores = result.evaluatorReports.map((r) => r.confidence);
  expect(scores).toHaveLength(13);

  const expectedScore = Math.round(scores.reduce((sum, c) => sum + c * 100, 0) / 13);
  expect(result.score).toBe(expectedScore);
});

test("scene prose gate perfect scene scores 100", () => {
  const gate = new SceneProseGate();
  const result = gate.evaluate(perfectScene(), perfectBible());

  expect(result.verdict).toBe("pass");
  expect(result.score).toBe(100);
});

function bible(): InMemoryStoryBible {
  const bible = new InMemoryStoryBible();
  bible.characters.set("ada", {
    id: "ada",
    name: "Ada",
    aliases: [],
    tags: [],
    traits: {},
    relationships: new Map(),
    knowledge: new Set(),
    arcBeatIds: [],
  });
  bible.characters.set("mira", {
    id: "mira",
    name: "Mira",
    aliases: [],
    tags: [],
    traits: {},
    relationships: new Map(),
    knowledge: new Set(),
    arcBeatIds: [],
  });
  bible.locations.set("archive", {
    id: "archive",
    name: "Archive",
    aliases: [],
    tags: [],
    description: "Archive room with shadow.",
    relatedLocations: [],
  });
  bible.thematicProgression.recordIntensity("loyalty", "scene-1", 4);
  return bible;
}

function goodScene(): SceneDocument {
  return {
    id: "scene-1",
    title: "Archive Warning",
    status: SceneStatus.Draft,
    metadata: {
      pov: "ada",
      characters: ["ada", "mira"],
      locations: ["archive"],
      tension: 5,
      mood: "mysterious",
      plotThreads: ["thread-1"],
      thematicMotifs: ["loyalty"],
      dramaticQuestions: ["question-1"],
    },
    prose: `Ada stepped into the Archive with Mira close behind her, and the door sighed against the wall. Dust hung in the air like old snow. The shadow under the reading table looked too deep, but Ada opened the ledger anyway because loyalty mattered more than fear.

"Keep watch," Ada said. Mira looked toward the window, reached for the lamp, and whispered, "Someone moved outside." The warning turned the quiet room sharp. Ada saw fresh mud on the floor, heard a loose latch tap in the wind, and felt the danger press closer.

However, the page named the mayor before it named the victim, therefore the secret could not stay hidden. Ada took the torn note, ran her thumb across the seal, and realized Mira had risked everything to bring her here. The threat was urgent now, until both women chose whether the truth was worth the trap closing around them.`,
    customFields: {},
  };
}

function perfectBible(): InMemoryStoryBible {
  const bible = new InMemoryStoryBible();
  bible.characters.set("ada", {
    id: "ada", name: "Ada", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  bible.characters.set("mira", {
    id: "mira", name: "Mira", aliases: [], tags: [], traits: {},
    relationships: new Map(), knowledge: new Set(), arcBeatIds: [],
  });
  bible.locations.set("archive", {
    id: "archive", name: "Archive", aliases: [], tags: [],
    description: "Archive room with shadow.", relatedLocations: [],
  });
  bible.thematicProgression.recordIntensity("loyalty", "scene-1", 4);
  return bible;
}

function perfectScene(): SceneDocument {
  return {
    id: "scene-perfect",
    title: "The Archive Secret",
    status: SceneStatus.Draft,
    metadata: {
      pov: "ada",
      characters: ["ada", "mira"],
      locations: ["archive"],
      tension: 5,
      mood: "mysterious",
      plotThreads: ["thread-1"],
      thematicMotifs: ["loyalty"],
      dramaticQuestions: ["question-1"],
    },
    prose: `Ada stepped into the Archive with Mira close behind her. The door sighed against the wall. Dust hung in the air like old snow. The shadow under the reading table looked too deep, but Ada opened the ledger anyway because loyalty mattered more than fear.

"Keep watch," Ada whispered. Mira looked toward the window, reached for the lamp, and asked, "Who moved outside?" Then the warning turned the quiet room sharp. Ada saw fresh mud on the floor, heard a loose latch tap in the wind, and felt the danger press closer.

However, the page named the mayor before it named the victim, therefore the secret could not stay hidden. Instead, Ada took the torn note, ran her thumb across the seal, and realized Mira had risked everything to bring her here. The threat was urgent now, until both women chose whether the truth was worth the trap closing around them.`,
    customFields: {},
  };
}
