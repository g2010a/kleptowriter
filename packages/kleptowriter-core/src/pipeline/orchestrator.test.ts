import { expect, test } from "bun:test";
import type { StoryBible } from "../data-model/bible/interfaces.js";
import { PipelineOrchestrator, PipelinePhase } from "./orchestrator.js";

const makeBible = (): StoryBible => ({
  characters: new Map(),
  locations: new Map(),
  items: new Map(),
  chronology: [],
  arcs: new Map(),
  plotThreads: new Map(),
  dramaticQuestions: new Map(),
  knowledgeState: {
    knows: () => false,
    learn: () => undefined,
    queryFactsByCharacter: () => [],
    allFacts: () => new Map(),
  },
  thematicProgression: {
    themes: new Map(),
    getIntensity: () => 0,
    recordIntensity: () => undefined,
  },
});

test("pipeline phases advance in order", () => {
  const orchestrator = new PipelineOrchestrator({ bible: makeBible(), currentSceneIndex: 0, maxScenes: 3 });

  expect(orchestrator.getCurrentPhase()).toBe(PipelinePhase.MaterialIngestion);

  const material = orchestrator.runPhase(PipelinePhase.MaterialIngestion);
  expect(material.status).toBe("success");
  expect(material.nextPhase).toBe(PipelinePhase.Interview);
  expect(orchestrator.getCurrentPhase()).toBe(PipelinePhase.Interview);

  const interview = orchestrator.runPhase(PipelinePhase.Interview);
  expect(interview.nextPhase).toBe(PipelinePhase.SceneLoop);

  const sceneLoop = orchestrator.runPhase(PipelinePhase.SceneLoop);
  expect(sceneLoop.nextPhase).toBe(PipelinePhase.Revision);
});

test("pipeline records lifecycle events", () => {
  const orchestrator = new PipelineOrchestrator({ bible: makeBible(), currentSceneIndex: 1, maxScenes: 2 });
  const result = orchestrator.runPhase(PipelinePhase.SceneLoop);

  expect(result.events.map((event) => event.type)).toEqual([
    "scene-loop:enter",
    "scene-loop:triggered",
    "scene-loop:exit",
  ]);
  expect(result.events.every((event) => typeof event.timestamp === "number")).toBe(true);
  expect(result.events[1]?.data).toMatchObject({ currentSceneIndex: 1, maxScenes: 2 });
});

test("pipeline completes after revision", () => {
  const orchestrator = new PipelineOrchestrator({ bible: makeBible(), currentSceneIndex: 0, maxScenes: 1 });

  for (const phase of [
    PipelinePhase.MaterialIngestion,
    PipelinePhase.Interview,
    PipelinePhase.SceneLoop,
    PipelinePhase.Revision,
  ]) {
    orchestrator.runPhase(phase);
  }

  expect(orchestrator.getCurrentPhase()).toBeNull();
  expect(orchestrator.isComplete()).toBe(true);
  expect(orchestrator.getPhaseHistory().map((result) => result.phase)).toEqual([
    PipelinePhase.MaterialIngestion,
    PipelinePhase.Interview,
    PipelinePhase.SceneLoop,
    PipelinePhase.Revision,
  ]);
});
