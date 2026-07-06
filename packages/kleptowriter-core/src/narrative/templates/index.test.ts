import { expect, test } from "bun:test";
import { builtInTemplates, templateRegistry } from "./index.js";

test("built-in narrative templates are complete and internally linked", () => {
  const templates = Object.values(builtInTemplates);

  expect(templates).toHaveLength(12);
  expect(templateRegistry.listStructures()).toHaveLength(12);
  expect(templateRegistry.getStructure("Hero's Journey")?.beats).toHaveLength(17);

  for (const template of templates) {
    expect(template.name).not.toBe("");
    expect(template.description).not.toBe("");
    expect(template.beats.length).toBeGreaterThan(0);
    expect(template.constraints.length).toBeGreaterThan(0);

    const beatIds = new Set(template.beats.map((beat) => beat.id));

    for (const beat of template.beats) {
      const transitionWeight = beat.transitions.reduce((sum, transition) => sum + transition.weight, 0);

      expect(transitionWeight).toBeCloseTo(1, 5);

      for (const transition of beat.transitions) {
        expect(beatIds.has(transition.to)).toBe(true);
      }
    }
  }
});
