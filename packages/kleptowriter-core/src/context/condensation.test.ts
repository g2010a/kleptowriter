import { expect, test } from "bun:test";
import type { SceneDocument } from "../data-model/scene/index.js";
import { SceneStatus } from "../types/index.js";
import { CondensationStrategy } from "./condensation.js";

test("condenses a scene into fewer bullet tokens than the original prose", () => {
  const scene: SceneDocument = {
    id: "scene-condense-001",
    title: "Market Ambush",
    status: SceneStatus.Draft,
    metadata: {
      pov: "mara",
      characters: ["mara", "tomas", "veil-agent"],
      locations: ["south-market"],
      tension: 8,
      mood: "urgent",
      plotThreads: ["stolen-ledger"],
      thematicMotifs: ["trust"],
      dramaticQuestions: ["Can Mara protect the ledger?"],
    },
    prose:
      "Mara crossed the south market at dawn while Tomas argued with a spice seller to draw attention away from her. " +
      "A veil-agent spotted the stolen ledger under her coat and knocked over a cart to block the alley. " +
      "Mara threw pepper into the agent's eyes, passed the ledger to Tomas, and led the chase toward the bell tower. " +
      "Tomas escaped through the crowd with the ledger, but Mara realized the agent had seen the cipher mark on her wrist.",
    customFields: {},
  };

  const summary = new CondensationStrategy().condense(scene);

  expect(summary.tier).toBe("bullet");
  expect(summary.content.split("\n").length).toBeGreaterThanOrEqual(3);
  expect(summary.content.split("\n").length).toBeLessThanOrEqual(5);
  expect(summary.condensedTokens).toBeLessThan(summary.originalTokens);
});
