import { expect, test } from "bun:test";
import { ConstraintChecker } from "./constraints/checker.js";
import { MarkovStructureGuidanceImpl } from "./guidance.js";
import { MarkovInferenceEngine } from "./markov/engine.js";
import { MarkovPathPredictor } from "./markov/predictor.js";
import { herosJourney } from "./templates/heros-journey.js";

test("guidance reports progress and predictions", () => {
  const engine = new MarkovInferenceEngine();
  engine.addTransition("start", "middle", 1);
  engine.addTransition("middle", "end", 1);

  const checker = new ConstraintChecker();
  const predictor = new MarkovPathPredictor(engine);
  const guidance = new MarkovStructureGuidanceImpl(engine, checker, predictor, herosJourney);

  guidance.advanceBeat("start");
  expect(guidance.getCurrentBeat()).toBe("start");

  const candidates = guidance.getNextBeatCandidates();
  expect(candidates.length).toBeGreaterThan(0);

  const report = guidance.getConstraintReport();
  expect(report.length).toBe(herosJourney.constraints.length);

  const progress = guidance.getStoryProgress();
  expect(progress).toBeGreaterThan(0);
  expect(progress).toBeLessThanOrEqual(1);
});

test("guidance predicts future path", () => {
  const engine = new MarkovInferenceEngine();
  engine.addTransition("A", "B", 1);
  engine.addTransition("B", "C", 1);

  const checker = new ConstraintChecker();
  const predictor = new MarkovPathPredictor(engine);
  const guidance = new MarkovStructureGuidanceImpl(engine, checker, predictor);

  guidance.advanceBeat("A");
  const pathDist = guidance.getPredictedPath(2);
  expect(pathDist.length).toBeGreaterThan(0);
  expect(pathDist[0]?.path[0]).toBe("A");
});
