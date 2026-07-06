import type { Transition, TransitionCandidate } from "./types.js";

type TransitionWeights = Map<string, number>;
type FirstOrderTransitions = Map<string, TransitionWeights>;
type HigherOrderTransitions = Map<string, Map<string, TransitionWeights>>;

export class MarkovInferenceEngine {
  private readonly firstOrderTransitions: FirstOrderTransitions = new Map();
  private readonly secondOrderTransitions: HigherOrderTransitions = new Map();
  private readonly thirdOrderTransitions: HigherOrderTransitions = new Map();
  private readonly beats: Set<string> = new Set();
  private maxOrder = 0;

  train(transitions: Transition[]): void {
    this.clear();

    for (const transition of transitions) {
      this.addTransition(transition.from, transition.to, transition.weight, transition.context);
    }
  }

  predictNext(state: { currentBeat: string; history?: string[] }): TransitionCandidate[] {
    const weightedTransitions = this.getBestTransitions(state.currentBeat, state.history);

    if (!weightedTransitions) {
      return [];
    }

    const probabilities = this.normalizeWeights(weightedTransitions.transitions);

    return [...probabilities]
      .map(([beat, probability]) => ({ beat, probability, order: weightedTransitions.order }))
      .sort((left, right) => right.probability - left.probability);
  }

  sample(fromBeat: string, history?: string[]): string {
    const candidates = this.predictNext({ currentBeat: fromBeat, history });

    if (candidates.length === 0) {
      return this.sampleUniformBeat();
    }

    const roll = Math.random();
    let cumulativeProbability = 0;

    for (const candidate of candidates) {
      cumulativeProbability += candidate.probability;

      if (roll <= cumulativeProbability) {
        return candidate.beat;
      }
    }

    return candidates[candidates.length - 1]?.beat ?? this.sampleUniformBeat();
  }

  getTransitionProbabilities(fromBeat: string): Map<string, number> {
    return this.normalizeWeights(this.firstOrderTransitions.get(fromBeat));
  }

  addTransition(from: string, to: string, weight = 1, context?: string[]): void {
    this.beats.add(from);
    this.beats.add(to);
    this.addWeightedTransition(this.firstOrderTransitions, from, to, weight);
    this.maxOrder = Math.max(this.maxOrder, 1);

    if (!context || context.length === 0) {
      return;
    }

    this.addHigherOrderTransition(this.secondOrderTransitions, context.at(-1), from, to, weight);
    this.maxOrder = Math.max(this.maxOrder, 2);

    if (context.length >= 2) {
      this.addHigherOrderTransition(this.thirdOrderTransitions, this.thirdOrderKey(context), from, to, weight);
      this.maxOrder = Math.max(this.maxOrder, 3);
    }
  }

  getOrder(): number {
    return this.maxOrder;
  }

  clear(): void {
    this.firstOrderTransitions.clear();
    this.secondOrderTransitions.clear();
    this.thirdOrderTransitions.clear();
    this.beats.clear();
    this.maxOrder = 0;
  }

  private getBestTransitions(
    currentBeat: string,
    history?: string[],
  ): { transitions: TransitionWeights; order: number } | undefined {
    if (history && history.length >= 2) {
      const transitions = this.thirdOrderTransitions.get(this.thirdOrderKey(history))?.get(currentBeat);

      if (transitions) {
        return { transitions, order: 3 };
      }
    }

    const previousBeat = history?.at(-1);

    if (previousBeat) {
      const transitions = this.secondOrderTransitions.get(previousBeat)?.get(currentBeat);

      if (transitions) {
        return { transitions, order: 2 };
      }
    }

    const transitions = this.firstOrderTransitions.get(currentBeat);

    return transitions ? { transitions, order: 1 } : undefined;
  }

  private addWeightedTransition(transitions: FirstOrderTransitions, from: string, to: string, weight: number): void {
    const existingTransitions = transitions.get(from) ?? new Map<string, number>();
    existingTransitions.set(to, (existingTransitions.get(to) ?? 0) + weight);
    transitions.set(from, existingTransitions);
  }

  private addHigherOrderTransition(
    transitions: HigherOrderTransitions,
    contextKey: string | undefined,
    from: string,
    to: string,
    weight: number,
  ): void {
    if (!contextKey) {
      return;
    }

    const contextTransitions = transitions.get(contextKey) ?? new Map<string, TransitionWeights>();
    const beatTransitions = contextTransitions.get(from) ?? new Map<string, number>();
    beatTransitions.set(to, (beatTransitions.get(to) ?? 0) + weight);
    contextTransitions.set(from, beatTransitions);
    transitions.set(contextKey, contextTransitions);
  }

  private normalizeWeights(transitions: TransitionWeights | undefined): Map<string, number> {
    if (!transitions) {
      return new Map();
    }

    const totalWeight = [...transitions.values()].reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
      return new Map();
    }

    return new Map([...transitions].map(([beat, weight]) => [beat, weight / totalWeight]));
  }

  private sampleUniformBeat(): string {
    const beats = [...this.beats];

    if (beats.length === 0) {
      return "";
    }

    return beats[Math.floor(Math.random() * beats.length)] ?? "";
  }

  private thirdOrderKey(context: string[]): string {
    return context.slice(-2).join("\u0000");
  }
}
