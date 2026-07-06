import type { MarkovInferenceEngine } from "./engine.js";
import type { PathDistribution } from "./types.js";

const DEFAULT_ITERATIONS = 1_000;

export class MarkovPathPredictor {
  constructor(private readonly engine: MarkovInferenceEngine) {}

  simulate(fromBeat: string, steps: number, iterations: number): PathDistribution[] {
    const pathCounts = new Map<string, number>();
    const safeSteps = Math.max(0, Math.floor(steps));
    const safeIterations = Math.max(0, Math.floor(iterations));

    for (let i = 0; i < safeIterations; i++) {
      const path = this.walk(fromBeat, safeSteps);
      const key = JSON.stringify(path);
      pathCounts.set(key, (pathCounts.get(key) ?? 0) + 1);
    }

    return [...pathCounts]
      .map(([key, count]) => ({ path: JSON.parse(key) as string[], probability: count / safeIterations }))
      .sort((left, right) => right.probability - left.probability);
  }

  mostLikelyPath(fromBeat: string, steps: number): string[] {
    return this.simulate(fromBeat, steps, DEFAULT_ITERATIONS)[0]?.path ?? [fromBeat];
  }

  private walk(fromBeat: string, steps: number): string[] {
    const path = [fromBeat];

    for (let i = 0; i < steps; i++) {
      const nextBeat = this.engine.sample(path.at(-1) ?? fromBeat, path.slice(0, -1));
      path.push(nextBeat);
    }

    return path;
  }
}
