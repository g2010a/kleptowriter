/**
 * evaluate_prose Pi tool — reads a scene by ID, runs core extraction/prose gate,
 * and returns a verdict with a structured report.
 *
 * Scene files are read from `story/scenes/{sceneId}.md` using the core
 * `readScene()` parser. An empty `InMemoryStoryBible` is used for evaluation
 * (bible persistence is a separate concern). Nonexistent or unparseable scenes
 * return a clean error result instead of throwing.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { EvaluateProseParamsSchema, type Verdict } from "./types.js";
import { readScene, SceneProseGate, InMemoryStoryBible } from "@kleptowriter/kleptowriter-core";
import { SceneExtractor } from "@kleptowriter/kleptowriter-core/eval/extractor.js";
import { NoteCollector } from "@kleptowriter/kleptowriter-core/eval/notes.js";
import type { AgentNote } from "@kleptowriter/kleptowriter-core/eval/notes.js";
import type { SceneDocument } from "@kleptowriter/kleptowriter-core";

const SCENES_DIR = join("story", "scenes");

const AGENT_CATEGORY: Record<string, AgentNote["category"]> = {
  "prose-narratologist": "structure",
  "prose-pacing-analyst": "prose",
  "prose-character-consistency": "character",
  "prose-thematic-coherence": "plot",
  "prose-worldbuilding": "continuity",
  "prose-dialogist": "style",
  "prose-stylesheet": "style",
  "prose-mood-tension-curator": "prose",
};

function verdictToSeverity(verdict: string): AgentNote["severity"] {
  return verdict === "reject" ? "blocking" : verdict === "conditional" ? "warning" : "info";
}

export const evaluateProseTool = defineTool({
  name: "evaluate_prose",
  label: "Evaluate Prose",
  description:
    "Evaluates the prose quality of a scene. Returns a verdict of " +
    "'pass', 'conditional', or 'reject' together with a detailed " +
    "evaluation report.",
  parameters: EvaluateProseParamsSchema,
  execute: async (_toolCallId, params) => {
    const { sceneId } = params;
    const scenePath = join(SCENES_DIR, `${sceneId}.md`);

    // Read + parse the scene file
    const readResult = await readScene(scenePath);
    let ok = false;
    let error: string | null = null;
    let verdict: Verdict = "reject";
    let report: Record<string, unknown> | null = null;

    if (readResult.ok) {
      const scene: SceneDocument = readResult.data;
      const bible = new InMemoryStoryBible();

      // Run core extraction + prose gate
      const extractor = new SceneExtractor();
      const gate = new SceneProseGate();

      const extracted = extractor.extract(scene, bible);
      const gateResult = gate.evaluate(scene, bible);

      verdict = gateResult.verdict;

      const collector = new NoteCollector();
      let noteSeq = 0;
      for (const evalReport of gateResult.evaluatorReports) {
        for (const finding of evalReport.findings) {
          if (!finding.startsWith("FAIL:")) continue;
          noteSeq++;
          collector.addNote({
            id: `note-${noteSeq}`,
            agentId: evalReport.agentId,
            sceneId: scene.id,
            note: finding.slice(6).trim(),
            severity: verdictToSeverity(evalReport.verdict),
            category: AGENT_CATEGORY[evalReport.agentId] ?? "prose",
            timestamp: Date.now(),
          });
        }
      }

      report = {
        sceneId: scene.id,
        title: scene.title,
        extractedMetadata: extracted,
        proseGate: {
          verdict: gateResult.verdict,
          score: gateResult.score,
          message: gateResult.message,
          evaluatorReports: gateResult.evaluatorReports.map((r) => ({
            agentId: r.agentId,
            verdict: r.verdict,
            confidence: r.confidence,
            findings: r.findings,
          })),
        },
        notes: collector.collectNotes(scene.id),
      };
      ok = true;
    } else {
      error = readResult.error;
    }

    const text = ok
      ? JSON.stringify({ verdict, report }, null, 2)
      : `Error reading scene "${sceneId}": ${error}`;

    return {
      content: [{ type: "text" as const, text }],
      details: { ok, error, verdict, report },
    };
  },
});
