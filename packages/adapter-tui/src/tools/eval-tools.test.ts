import { expect, test, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateProseTool } from "./eval-tools.js";
import type { EvaluateProseParams } from "./types.js";

const REAL_CWD = process.cwd();
const SCENES_DIR = join(REAL_CWD, "story", "scenes");
const CLEANUP_IDS: string[] = [];

afterEach(() => {
  for (const id of CLEANUP_IDS) {
    try {
      rmSync(join(SCENES_DIR, `${id}.md`), { force: true });
    } catch { /* ignore */ }
  }
  CLEANUP_IDS.length = 0;
});

function writeScene(sceneId: string, title: string, prose: string) {
  mkdirSync(SCENES_DIR, { recursive: true });
  CLEANUP_IDS.push(sceneId);
  const content = [
    "---",
    `id: ${sceneId}`,
    `title: ${title}`,
    `status: 2`,
    "metadata:",
    "  pov: ada",
    "  characters:",
    "    - ada",
    "    - ben",
    "  locations:",
    "    - library",
    "  tension: 5",
    "  mood: mysterious",
    "  plotThreads:",
    "    - mystery",
    "  thematicMotifs:",
    "    - knowledge",
    "  dramaticQuestions:",
    "    - q1",
    "---",
    prose,
  ].join("\n");
  writeFileSync(join(SCENES_DIR, `${sceneId}.md`), content);
}

// ── Valid scene evaluation ─────────────────────────────────────────────────

test("evaluate_prose returns valid verdict for good scene", async () => {
  writeScene(
    "eval-prose-01-good",
    "The Archive Warning",
    `Ada stepped into the Archive with Mira close behind her, and the door sighed against the wall. Dust hung in the air like old snow. The shadow under the reading table looked too deep, but Ada opened the ledger anyway because loyalty mattered more than fear.

"Keep watch," Ada said. Mira looked toward the window, reached for the lamp, and whispered, "Someone moved outside." The warning turned the quiet room sharp. Ada saw fresh mud on the floor, heard a loose latch tap in the wind, and felt the danger press closer.

However, the page named the mayor before it named the victim, therefore the secret could not stay hidden. Ada took the torn note, ran her thumb across the seal, and realized Mira had risked everything to bring her here. The threat was urgent now, until both women chose whether the truth was worth the trap closing around them.`,
  );

  const params: EvaluateProseParams = { sceneId: "eval-prose-01-good" };
  const result = await evaluateProseTool.execute("call-1", params, undefined, undefined, {} as any);
  const details = result.details as any;

  expect(details.ok).toBe(true);
  expect(["pass", "conditional", "reject"]).toContain(details.verdict);
  expect(details.report).toBeDefined();
  expect(details.report.sceneId).toBe("eval-prose-01-good");
  expect(details.report.title).toBe("The Archive Warning");
  expect(details.report.proseGate).toBeDefined();
  expect(details.report.proseGate.evaluatorReports).toHaveLength(13);
  expect(details.report.extractedMetadata).toBeDefined();
  expect(Array.isArray(details.report.notes)).toBe(true);
});

// ── Nonexistent scene ──────────────────────────────────────────────────────

test("evaluate_prose returns error for nonexistent scene", async () => {
  const params: EvaluateProseParams = { sceneId: "setup-99-nosuch" };
  const result = await evaluateProseTool.execute("call-2", params, undefined, undefined, {} as any);
  const details = result.details as any;

  expect(details.ok).toBe(false);
  expect(typeof details.error).toBe("string");
  expect(details.verdict).toBe("reject");
});

// ── Notes populated for thin/reject scene ──────────────────────────────────

test("evaluate_prose populates notes from FAIL findings for thin scene", async () => {
  writeScene(
    "eval-prose-02-thin",
    "Too Short",
    "Ada waits.",
  );

  const params: EvaluateProseParams = { sceneId: "eval-prose-02-thin" };
  const result = await evaluateProseTool.execute("call-3", params, undefined, undefined, {} as any);
  const details = result.details as any;

  expect(details.ok).toBe(true);
  expect(details.verdict).toBe("reject");
  expect(Array.isArray(details.report.notes)).toBe(true);
  expect(details.report.notes.length).toBeGreaterThan(0);

  const note = details.report.notes[0];
  expect(typeof note.id).toBe("string");
  expect(typeof note.agentId).toBe("string");
  expect(note.sceneId).toBe("eval-prose-02-thin");
  expect(typeof note.note).toBe("string");
  expect(["info", "warning", "blocking"]).toContain(note.severity);
  expect(["continuity", "character", "plot", "style", "prose", "structure", "research"]).toContain(note.category);
  expect(typeof note.timestamp).toBe("number");
});
