import type { NarrativeStructure } from "./types.js";

export const fichteanCurve: NarrativeStructure = {
  name: "Fichtean Curve",
  description: "A pressure-driven structure that begins in motion and rises through repeated crises toward climax.",
  beats: [
    {
      id: "rising-action",
      name: "Rising Action",
      description: "Open inside active trouble and keep escalating through linked incidents.",
      type: "rising",
      transitions: [
        { to: "mini-crisis", weight: 0.65 },
        { to: "crisis", weight: 0.35 },
      ],
    },
    {
      id: "mini-crisis",
      name: "Mini-Crisis",
      description: "A compact setback or revelation raises tension without yet resolving the main question.",
      type: "conflict",
      transitions: [
        { to: "rising-action", weight: 0.45 },
        { to: "crisis", weight: 0.55 },
      ],
    },
    {
      id: "crisis",
      name: "Crisis",
      description: "The accumulated pressure corners the protagonist into an irreversible choice.",
      type: "climax",
      transitions: [{ to: "climax", weight: 1 }],
    },
    {
      id: "climax",
      name: "Climax",
      description: "The final explosive turn resolves the pressure created by the chain of crises.",
      type: "resolution",
      transitions: [{ to: "rising-action", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "occurrence",
      beatId: "mini-crisis",
      minCount: 2,
      severity: "warning",
      description: "The curve works best with multiple mini-crises before the decisive crisis.",
    },
    {
      type: "ordering",
      beforeBeat: "rising-action",
      afterBeat: "crisis",
      severity: "blocking",
      description: "The major crisis should emerge from prior escalation.",
    },
    {
      type: "tension",
      beatId: "crisis",
      minTension: 0.8,
      severity: "warning",
      description: "The crisis must feel like the highest pressure before climax releases it.",
    },
  ],
};
