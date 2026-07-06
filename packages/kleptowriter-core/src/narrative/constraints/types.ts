export type Constraint =
  | OrderingConstraint
  | OccurrenceConstraint
  | DistanceConstraint
  | ReferenceConstraint
  | TensionConstraint;

export type ConstraintSeverity = "blocking" | "warning" | "info";

export interface ConstraintBase {
  id: string;
  type: string;
  severity: ConstraintSeverity;
  description: string;
}

export interface OrderingConstraint extends ConstraintBase {
  type: "ordering";
  beforeBeat: string;
  afterBeat: string;
  check(progress: BeatProgress): ConstraintResult;
}

export interface OccurrenceConstraint extends ConstraintBase {
  type: "occurrence";
  beatId: string;
  minCount?: number;
  maxCount?: number;
  exactCount?: number;
  check(progress: BeatProgress): ConstraintResult;
}

export interface DistanceConstraint extends ConstraintBase {
  type: "distance";
  beatA: string;
  beatB: string;
  maxScenesApart: number;
  check(progress: BeatProgress): ConstraintResult;
}

export interface ReferenceConstraint extends ConstraintBase {
  type: "reference";
  ifBeat: string;
  thenBeat: string;
  relation: "must_also_occur" | "must_not_occur";
  check(progress: BeatProgress): ConstraintResult;
}

export interface TensionConstraint extends ConstraintBase {
  type: "tension";
  beatId: string;
  minTension?: number;
  maxTension?: number;
  targetTension?: number;
  check(progress: BeatProgress): ConstraintResult;
}

export interface BeatProgress {
  completedBeats: string[];
  currentBeat?: string;
  sceneTensions?: Map<string, number>;
  sceneOrder: string[];
}

export interface ConstraintResult {
  id: string;
  satisfied: boolean;
  severity: ConstraintSeverity;
  message: string;
}
