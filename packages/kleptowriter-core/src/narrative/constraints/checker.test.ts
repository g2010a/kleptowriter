import { expect, test } from "bun:test";
import {
  ConstraintChecker,
  createDistanceConstraint,
  createOccurrenceConstraint,
  createOrderingConstraint,
  createReferenceConstraint,
  createTensionConstraint,
} from "./index.js";
import type { BeatProgress } from "./index.js";

const progress: BeatProgress = {
  completedBeats: ["setup", "clue", "clue", "payoff"],
  sceneOrder: ["setup", "clue", "payoff"],
  sceneTensions: new Map([["payoff", 8]]),
};

test("checks narrative constraints", () => {
  expect(
    createOrderingConstraint({
      id: "order",
      type: "ordering",
      severity: "blocking",
      description: "setup before payoff",
      beforeBeat: "setup",
      afterBeat: "payoff",
    }).check(progress).satisfied,
  ).toBe(true);

  expect(
    createOccurrenceConstraint({
      id: "occurs",
      type: "occurrence",
      severity: "warning",
      description: "clue twice",
      beatId: "clue",
      exactCount: 2,
    }).check(progress).satisfied,
  ).toBe(true);

  expect(
    createDistanceConstraint({
      id: "distance",
      type: "distance",
      severity: "warning",
      description: "clue near payoff",
      beatA: "clue",
      beatB: "payoff",
      maxScenesApart: 1,
    }).check(progress).satisfied,
  ).toBe(true);

  expect(
    createReferenceConstraint({
      id: "reference",
      type: "reference",
      severity: "blocking",
      description: "setup requires payoff",
      ifBeat: "setup",
      thenBeat: "payoff",
      relation: "must_also_occur",
    }).check(progress).satisfied,
  ).toBe(true);

  expect(
    createTensionConstraint({
      id: "tension",
      type: "tension",
      severity: "info",
      description: "payoff is tense",
      beatId: "payoff",
      minTension: 7,
      maxTension: 9,
    }).check(progress).satisfied,
  ).toBe(true);
});

test("checks all narrative constraints and scores satisfaction", () => {
  const checker = new ConstraintChecker();
  const results = checker.checkAll(
    [
      createOrderingConstraint({
        id: "order",
        type: "ordering",
        severity: "blocking",
        description: "setup before payoff",
        beforeBeat: "setup",
        afterBeat: "payoff",
      }),
      createOccurrenceConstraint({
        id: "missing",
        type: "occurrence",
        severity: "warning",
        description: "reveal appears once",
        beatId: "reveal",
        exactCount: 1,
      }),
    ],
    progress,
  );

  expect(results.map((result) => result.satisfied)).toEqual([true, false]);
  expect(checker.getSatisfactionScore(results)).toBe(0.5);
});
