export type NarrativeBeatType = "setup" | "conflict" | "rising" | "climax" | "falling" | "resolution";

export interface NarrativeTransition {
  to: string;
  weight: number;
}

export interface NarrativeBeat {
  id: string;
  name: string;
  description: string;
  type: NarrativeBeatType;
  transitions: NarrativeTransition[];
}

export type TemplateConstraint =
  | TemplateOrderingConstraint
  | TemplateOccurrenceConstraint
  | TemplateDistanceConstraint
  | TemplateReferenceConstraint
  | TemplateTensionConstraint;

interface TemplateConstraintBase {
  type: "ordering" | "occurrence" | "distance" | "reference" | "tension";
  severity: "blocking" | "warning" | "info";
  description: string;
}

export interface TemplateOrderingConstraint extends TemplateConstraintBase {
  type: "ordering";
  beforeBeat: string;
  afterBeat: string;
}

export interface TemplateOccurrenceConstraint extends TemplateConstraintBase {
  type: "occurrence";
  beatId: string;
  minCount?: number;
  maxCount?: number;
  exactCount?: number;
}

export interface TemplateDistanceConstraint extends TemplateConstraintBase {
  type: "distance";
  beatA: string;
  beatB: string;
  maxScenesApart: number;
}

export interface TemplateReferenceConstraint extends TemplateConstraintBase {
  type: "reference";
  ifBeat: string;
  thenBeat: string;
  relation: "must_also_occur" | "must_not_occur";
}

export interface TemplateTensionConstraint extends TemplateConstraintBase {
  type: "tension";
  beatId: string;
  minTension?: number;
  maxTension?: number;
  targetTension?: number;
}

export interface NarrativeStructure {
  name: string;
  description: string;
  beats: NarrativeBeat[];
  constraints: TemplateConstraint[];
}

export interface TemplateRegistry {
  getStructure(name: string): NarrativeStructure | undefined;
  listStructures(): string[];
}
