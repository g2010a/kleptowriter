import type { Constraint, BeatProgress, ConstraintResult } from "./constraints/types.js";
import {
  ConstraintChecker,
  createDistanceConstraint,
  createOccurrenceConstraint,
  createOrderingConstraint,
  createReferenceConstraint,
  createTensionConstraint,
} from "./constraints/checker.js";
import type { MarkovInferenceEngine } from "./markov/engine.js";
import type { MarkovPathPredictor } from "./markov/predictor.js";
import type { PathDistribution, TransitionCandidate } from "./markov/types.js";
import type { NarrativeStructure, TemplateConstraint } from "./templates/types.js";

export interface MarkovStructureGuidance {
  getCurrentBeat(): string | undefined;
  getNextBeatCandidates(): TransitionCandidate[];
  getConstraintReport(): ConstraintResult[];
  getPredictedPath(steps: number): PathDistribution[];
  getStoryProgress(): number;
}

export class MarkovStructureGuidanceImpl implements MarkovStructureGuidance {
  constructor(
    private readonly engine: MarkovInferenceEngine,
    private readonly checker: ConstraintChecker,
    private readonly predictor: MarkovPathPredictor,
    private readonly template?: NarrativeStructure,
    private progress: BeatProgress = { completedBeats: [], sceneOrder: [], sceneTensions: new Map() },
  ) {}

  getCurrentBeat(): string | undefined {
    return this.progress.completedBeats.at(-1);
  }

  getNextBeatCandidates(): TransitionCandidate[] {
    const current = this.getCurrentBeat();
    if (!current) return [];

    return this.engine.predictNext({ currentBeat: current, history: this.progress.completedBeats });
  }

  getConstraintReport(): ConstraintResult[] {
    return this.checker.checkAll(this.getTemplateConstraints(), this.progress);
  }

  getPredictedPath(steps: number): PathDistribution[] {
    const current = this.getCurrentBeat();
    if (!current) return [];

    return this.predictor.simulate(current, steps, 1_000);
  }

  getStoryProgress(): number {
    if (!this.template || this.template.beats.length === 0) return 0;

    return this.progress.completedBeats.length / this.template.beats.length;
  }

  advanceBeat(beatId: string, tension?: number): void {
    this.progress.completedBeats.push(beatId);

    if (!this.progress.sceneOrder.includes(beatId)) {
      this.progress.sceneOrder.push(beatId);
    }

    if (tension !== undefined) {
      this.progress.sceneTensions ??= new Map();
      this.progress.sceneTensions.set(beatId, tension);
    }
  }

  private getTemplateConstraints(): Constraint[] {
    return this.template?.constraints.map(toConstraint) ?? [];
  }
}

const toConstraint = (constraint: TemplateConstraint, index: number): Constraint => {
  const id = `template-${index}-${constraint.type}`;

  switch (constraint.type) {
    case "ordering":
      return createOrderingConstraint({ ...constraint, id });
    case "occurrence":
      return createOccurrenceConstraint({ ...constraint, id });
    case "distance":
      return createDistanceConstraint({ ...constraint, id });
    case "reference":
      return createReferenceConstraint({ ...constraint, id });
    case "tension":
      return createTensionConstraint({ ...constraint, id });
  }
};
