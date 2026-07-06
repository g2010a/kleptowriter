import type { NarrativeStructure } from "./types.js";

export const frameNarrative: NarrativeStructure = {
  name: "Frame Narrative",
  description: "An outer story encloses an inner tale, letting the act of telling reshape both narratives.",
  beats: [
    {
      id: "outer-opening",
      name: "Outer Opening",
      description: "Introduce the framing world, teller, listener, and reason a story must be told.",
      type: "setup",
      transitions: [{ to: "frame-invitation", weight: 1 }],
    },
    {
      id: "frame-invitation",
      name: "Frame Invitation",
      description: "A question, trial, confession, or ritual opens the nested story.",
      type: "setup",
      transitions: [{ to: "inner-opening", weight: 1 }],
    },
    {
      id: "inner-opening",
      name: "Inner Opening",
      description: "Begin the embedded tale with its own world and promise.",
      type: "setup",
      transitions: [{ to: "inner-rising", weight: 1 }],
    },
    {
      id: "inner-rising",
      name: "Inner Rising Action",
      description: "Develop the nested conflict while its meaning for the frame grows clearer.",
      type: "rising",
      transitions: [
        { to: "frame-interruption", weight: 0.3 },
        { to: "inner-climax", weight: 0.7 },
      ],
    },
    {
      id: "frame-interruption",
      name: "Frame Interruption",
      description: "Return briefly to the outer story so teller or listener can challenge the tale.",
      type: "conflict",
      transitions: [
        { to: "inner-rising", weight: 0.7 },
        { to: "inner-climax", weight: 0.3 },
      ],
    },
    {
      id: "inner-climax",
      name: "Inner Climax",
      description: "The nested story reaches the event that explains why it was framed.",
      type: "climax",
      transitions: [{ to: "inner-resolution", weight: 1 }],
    },
    {
      id: "inner-resolution",
      name: "Inner Resolution",
      description: "Resolve the embedded tale and return its lesson or mystery to the outer world.",
      type: "resolution",
      transitions: [{ to: "outer-closing", weight: 1 }],
    },
    {
      id: "outer-closing",
      name: "Outer Closing",
      description: "The frame story changes because the inner story has been heard.",
      type: "resolution",
      transitions: [{ to: "outer-opening", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "outer-opening",
      afterBeat: "inner-opening",
      severity: "blocking",
      description: "The frame must exist before the nested story begins.",
    },
    {
      type: "ordering",
      beforeBeat: "inner-resolution",
      afterBeat: "outer-closing",
      severity: "blocking",
      description: "The outer story closes in response to the completed inner tale.",
    },
    {
      type: "reference",
      ifBeat: "frame-interruption",
      thenBeat: "outer-closing",
      relation: "must_also_occur",
      severity: "info",
      description: "Frame interruptions should influence the final outer-world meaning.",
    },
  ],
};
