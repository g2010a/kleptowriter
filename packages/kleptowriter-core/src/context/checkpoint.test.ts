import { expect, test } from "bun:test";
import { join } from "node:path";
import { PipelinePhase } from "../pipeline/orchestrator.js";
import { CheckpointManager } from "./checkpoint.js";

test("saves and loads checkpoint state", () => {
  const manager = new CheckpointManager(join(import.meta.dir, "../../story/checkpoints"));
  const checkpoint = manager.save({
    phase: PipelinePhase.SceneLoop,
    currentSceneIndex: 3,
    bibleVersion: 7,
    completedBeatIds: ["beat-1", "beat-2"],
    sceneOrder: ["scene-1", "scene-2"],
    metadata: { agentStates: { critic: "ready", drafter: "paused" } },
  });

  expect(manager.load(checkpoint.id)).toEqual(checkpoint);
});
