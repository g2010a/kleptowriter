import { expect, test } from "bun:test";
import { IterationBudget, defaultBudgetConfig } from "./budget.js";

test("token budget rejects consumption past the max", () => {
  const budget = new IterationBudget();

  expect(budget.tryConsume("tokens", defaultBudgetConfig.maxTokensPerScene)).toBe(true);
  expect(budget.tryConsume("tokens", 1)).toBe(false);
  expect(budget.remaining("tokens")).toBe(0);
});

test("good enough thresholds are evaluator-specific", () => {
  const budget = new IterationBudget();

  expect(budget.isGoodEnough("narratologist", 5)).toBe(false);
  expect(budget.isGoodEnough("narratologist", 6)).toBe(true);
  expect(budget.isGoodEnough("worldbuilding", 4)).toBe(true);
  expect(budget.isGoodEnough("unknown", 10)).toBe(false);
});
