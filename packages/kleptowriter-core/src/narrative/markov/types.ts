export interface Transition {
  from: string;
  to: string;
  weight: number;
  context?: string[];
}

export interface TransitionCandidate {
  beat: string;
  probability: number;
  order: number;
}

export interface PathDistribution {
  path: string[];
  probability: number;
}
