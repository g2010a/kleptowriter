import { expect, test } from "bun:test";
import { MarkovInferenceEngine } from "./engine.js";
import { MarkovPathPredictor } from "./predictor.js";

function trainLinearChain(engine: MarkovInferenceEngine, ...beats: string[]) {
  for (let i = 0; i < beats.length - 1; i++) {
    engine.addTransition(beats[i]!, beats[i + 1]!, 1);
  }
}

test("mostLikelyPath returns deterministic chain", () => {
  const engine = new MarkovInferenceEngine();
  trainLinearChain(engine, "A", "B", "C");
  const predictor = new MarkovPathPredictor(engine);
  const path = predictor.mostLikelyPath("A", 2);
  expect(path).toEqual(["A", "B", "C"]);
});

test("simulate probabilities sum to ~1", () => {
  const engine = new MarkovInferenceEngine();
  trainLinearChain(engine, "A", "B", "C");
  const predictor = new MarkovPathPredictor(engine);
  const dist = predictor.simulate("A", 2, 100);
  const totalProb = dist.reduce((s, d) => s + d.probability, 0);
  expect(totalProb).toBeCloseTo(1.0, 2);
});
