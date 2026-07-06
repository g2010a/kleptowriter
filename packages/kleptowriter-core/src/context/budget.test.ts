import { expect, test } from "bun:test";
import { ContextWindowBudget, type ContextItem } from "./budget.js";

test("priority eviction keeps items that fit within the context budget", () => {
  const budget = new ContextWindowBudget(25_000);
  const items: ContextItem[] = [
    item("low", 10_000, 1),
    item("mid", 20_000, 2),
    item("high", 30_000, 3),
  ];

  expect(budget.fitWithinBudget(items).map((contextItem) => contextItem.id)).toEqual(["mid"]);
});

function item(id: string, estimatedTokens: number, priority: number): ContextItem {
  return {
    id,
    content: "x".repeat(estimatedTokens * 4),
    priority,
    estimatedTokens,
    category: "note",
  };
}
