import { expect, test } from "bun:test";
import { NoteCollector } from "./notes.js";

test("collects notes for a scene and aggregates by severity, category, and agent", () => {
  const collector = new NoteCollector();

  collector.addNote({
    id: "note-1",
    agentId: "agent-a",
    sceneId: "scene-1",
    note: "Continuity issue",
    severity: "warning",
    category: "continuity",
    timestamp: 1,
  });
  collector.addNote({
    id: "note-2",
    agentId: "agent-b",
    sceneId: "scene-1",
    note: "Character beat missing",
    severity: "blocking",
    category: "character",
    timestamp: 2,
  });
  collector.addNote({
    id: "note-3",
    agentId: "agent-a",
    sceneId: "scene-1",
    note: "Style cleanup",
    severity: "info",
    category: "style",
    timestamp: 3,
  });

  expect(collector.collectNotes("scene-1")).toHaveLength(3);

  const aggregation = collector.aggregate();
  expect(aggregation.total).toBe(3);
  expect(aggregation.bySeverity.warning).toHaveLength(1);
  expect(aggregation.bySeverity.blocking).toHaveLength(1);
  expect(aggregation.bySeverity.info).toHaveLength(1);
  expect(aggregation.byCategory.continuity).toHaveLength(1);
  expect(aggregation.byCategory.character).toHaveLength(1);
  expect(aggregation.byCategory.style).toHaveLength(1);
  expect(aggregation.byAgent["agent-a"]).toHaveLength(2);
  expect(aggregation.byAgent["agent-b"]).toHaveLength(1);
});
