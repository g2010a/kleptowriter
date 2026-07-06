import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { loadReports, saveReport, type PacingReport } from "./reports.js";

test("saveReport and loadReports round-trip pacing evaluation reports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kleptowriter-eval-"));
  const report: PacingReport = {
    agentId: "prose-pacing-analyst",
    role: "pacing-analyst",
    sceneId: "scene-1",
    verdict: "conditional",
    score: 78,
    confidence: 0.91,
    findings: [{ category: "pace", severity: "warning", message: "Opening beats run long." }],
    timestamp: 1710000000000,
    summary: "Pacing is solid but the scene lingers before the reveal.",
    wordCount: 1240,
    estimatedReadingTime: 6,
    beatBalance: 0.72,
  };

  try {
    await saveReport(report, directory);
    expect(await loadReports("scene-1", directory)).toEqual([report]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
