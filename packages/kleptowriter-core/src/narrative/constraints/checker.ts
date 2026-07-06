import type {
  BeatProgress,
  Constraint,
  ConstraintResult,
  DistanceConstraint,
  OccurrenceConstraint,
  OrderingConstraint,
  ReferenceConstraint,
  TensionConstraint,
} from "./types.js";
import type { StoryBible } from "../../data-model/bible/interfaces.js";

type WithoutCheck<T> = Omit<T, "check">;

const result = (
  constraint: Constraint,
  satisfied: boolean,
  message: string,
): ConstraintResult => ({
  id: constraint.id,
  satisfied,
  severity: constraint.severity,
  message,
});

const countBeat = (beats: string[], beatId: string): number =>
  beats.filter((beat) => beat === beatId).length;

export const createOrderingConstraint = (
  constraint: WithoutCheck<OrderingConstraint>,
): OrderingConstraint => ({
  ...constraint,
  check(progress) {
    return checkOrderingConstraint(this, progress);
  },
});

export const createOccurrenceConstraint = (
  constraint: WithoutCheck<OccurrenceConstraint>,
): OccurrenceConstraint => ({
  ...constraint,
  check(progress) {
    return checkOccurrenceConstraint(this, progress);
  },
});

export const createDistanceConstraint = (
  constraint: WithoutCheck<DistanceConstraint>,
): DistanceConstraint => ({
  ...constraint,
  check(progress) {
    return checkDistanceConstraint(this, progress);
  },
});

export const createReferenceConstraint = (
  constraint: WithoutCheck<ReferenceConstraint>,
): ReferenceConstraint => ({
  ...constraint,
  check(progress) {
    return checkReferenceConstraint(this, progress);
  },
});

export const createTensionConstraint = (
  constraint: WithoutCheck<TensionConstraint>,
): TensionConstraint => ({
  ...constraint,
  check(progress) {
    return checkTensionConstraint(this, progress);
  },
});

export const checkOrderingConstraint = (
  constraint: OrderingConstraint,
  progress: BeatProgress,
): ConstraintResult => {
  const beforeIndex = progress.sceneOrder.indexOf(constraint.beforeBeat);
  const afterIndex = progress.sceneOrder.indexOf(constraint.afterBeat);
  const satisfied = beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex;

  return result(
    constraint,
    satisfied,
    satisfied
      ? `${constraint.beforeBeat} appears before ${constraint.afterBeat}.`
      : `${constraint.beforeBeat} must appear before ${constraint.afterBeat}.`,
  );
};

export const checkOccurrenceConstraint = (
  constraint: OccurrenceConstraint,
  progress: BeatProgress,
): ConstraintResult => {
  const count = countBeat(progress.completedBeats, constraint.beatId);
  const satisfied =
    (constraint.exactCount === undefined || count === constraint.exactCount) &&
    (constraint.minCount === undefined || count >= constraint.minCount) &&
    (constraint.maxCount === undefined || count <= constraint.maxCount);

  return result(
    constraint,
    satisfied,
    satisfied
      ? `${constraint.beatId} occurs ${count} time(s), within required count.`
      : `${constraint.beatId} occurs ${count} time(s), outside required count.`,
  );
};

export const checkDistanceConstraint = (
  constraint: DistanceConstraint,
  progress: BeatProgress,
): ConstraintResult => {
  const indexA = progress.sceneOrder.indexOf(constraint.beatA);
  const indexB = progress.sceneOrder.indexOf(constraint.beatB);
  const distance = indexA === -1 || indexB === -1 ? Infinity : Math.abs(indexA - indexB);
  const satisfied = distance <= constraint.maxScenesApart;

  return result(
    constraint,
    satisfied,
    satisfied
      ? `${constraint.beatA} and ${constraint.beatB} are ${distance} scene(s) apart.`
      : `${constraint.beatA} and ${constraint.beatB} must be within ${constraint.maxScenesApart} scene(s).`,
  );
};

export const checkReferenceConstraint = (
  constraint: ReferenceConstraint,
  progress: BeatProgress,
): ConstraintResult => {
  const ifOccurs = progress.completedBeats.includes(constraint.ifBeat);
  const thenOccurs = progress.completedBeats.includes(constraint.thenBeat);
  const satisfied =
    !ifOccurs ||
    (constraint.relation === "must_also_occur" ? thenOccurs : !thenOccurs);

  return result(
    constraint,
    satisfied,
    satisfied
      ? `${constraint.ifBeat} reference rule for ${constraint.thenBeat} is satisfied.`
      : `${constraint.ifBeat} requires ${constraint.thenBeat} to ${constraint.relation === "must_also_occur" ? "also occur" : "not occur"}.`,
  );
};

export const checkTensionConstraint = (
  constraint: TensionConstraint,
  progress: BeatProgress,
): ConstraintResult => {
  const tension = progress.sceneTensions?.get(constraint.beatId);
  const satisfied =
    tension !== undefined &&
    (constraint.targetTension === undefined || tension === constraint.targetTension) &&
    (constraint.minTension === undefined || tension >= constraint.minTension) &&
    (constraint.maxTension === undefined || tension <= constraint.maxTension);

  return result(
    constraint,
    satisfied,
    satisfied
      ? `${constraint.beatId} tension is ${tension}, within required range.`
      : `${constraint.beatId} tension is ${tension ?? "missing"}, outside required range.`,
  );
};

export const checkConstraint = (
  constraint: Constraint,
  progress: BeatProgress,
): ConstraintResult => constraint.check(progress);

export class ConstraintChecker {
  checkAll(
    constraints: Constraint[],
    progress: BeatProgress,
    _bible?: StoryBible,
  ): ConstraintResult[] {
    return constraints.map((constraint) => checkConstraint(constraint, progress));
  }

  getSatisfactionScore(results: ConstraintResult[]): number {
    if (results.length === 0) return 1;

    return results.filter((result) => result.satisfied).length / results.length;
  }
}
