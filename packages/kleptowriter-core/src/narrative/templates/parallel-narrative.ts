import type { NarrativeStructure } from "./types.js";

export const parallelNarrative: NarrativeStructure = {
  name: "Parallel Narrative",
  description: "Two interleaved storylines develop separately, echo each other, and cross at key turns.",
  beats: [
    {
      id: "a-opening",
      name: "Storyline A Opening",
      description: "Introduce the first thread's protagonist, desire, and pressure.",
      type: "setup",
      transitions: [{ to: "b-opening", weight: 1 }],
    },
    {
      id: "b-opening",
      name: "Storyline B Opening",
      description: "Introduce the second thread with contrast or thematic rhyme.",
      type: "setup",
      transitions: [{ to: "a-complication", weight: 1 }],
    },
    {
      id: "a-complication",
      name: "Storyline A Complication",
      description: "Escalate A while planting an echo that B can answer.",
      type: "rising",
      transitions: [
        { to: "b-complication", weight: 0.8 },
        { to: "a-midpoint", weight: 0.2 },
      ],
    },
    {
      id: "b-complication",
      name: "Storyline B Complication",
      description: "Escalate B and reveal how it mirrors or contradicts A.",
      type: "rising",
      transitions: [
        { to: "a-midpoint", weight: 0.65 },
        { to: "b-midpoint", weight: 0.35 },
      ],
    },
    {
      id: "a-midpoint",
      name: "Storyline A Midpoint",
      description: "A's thread reverses and sends pressure across the structure.",
      type: "climax",
      transitions: [{ to: "b-midpoint", weight: 1 }],
    },
    {
      id: "b-midpoint",
      name: "Storyline B Midpoint",
      description: "B's reversal answers A's turn and tightens the braid.",
      type: "climax",
      transitions: [{ to: "crossing-point", weight: 1 }],
    },
    {
      id: "crossing-point",
      name: "Crossing Point",
      description: "The two storylines affect each other directly or reveal they always have.",
      type: "conflict",
      transitions: [
        { to: "a-resolution", weight: 0.55 },
        { to: "b-resolution", weight: 0.45 },
      ],
    },
    {
      id: "a-resolution",
      name: "Storyline A Resolution",
      description: "Resolve A with the consequences of B's pressure visible.",
      type: "resolution",
      transitions: [{ to: "b-resolution", weight: 1 }],
    },
    {
      id: "b-resolution",
      name: "Storyline B Resolution",
      description: "Resolve B and complete the thematic comparison between threads.",
      type: "resolution",
      transitions: [{ to: "a-opening", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "a-opening",
      afterBeat: "a-resolution",
      severity: "blocking",
      description: "Storyline A must be established before it resolves.",
    },
    {
      type: "ordering",
      beforeBeat: "b-opening",
      afterBeat: "b-resolution",
      severity: "blocking",
      description: "Storyline B must be established before it resolves.",
    },
    {
      type: "reference",
      ifBeat: "a-midpoint",
      thenBeat: "b-midpoint",
      relation: "must_also_occur",
      severity: "warning",
      description: "Parallel midpoints should speak to each other rather than feel isolated.",
    },
  ],
};
