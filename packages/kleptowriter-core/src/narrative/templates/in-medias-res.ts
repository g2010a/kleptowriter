import type { NarrativeStructure } from "./types.js";

export const inMediasRes: NarrativeStructure = {
  name: "In Medias Res",
  description: "A structure that opens at a high-stakes moment, flashes back for context, then returns to resolve the crisis.",
  beats: [
    {
      id: "opening-climax",
      name: "Opening Climax",
      description: "Begin in the middle of decisive action before readers know how everyone arrived there.",
      type: "climax",
      transitions: [{ to: "flashback-trigger", weight: 1 }],
    },
    {
      id: "flashback-trigger",
      name: "Flashback Trigger",
      description: "A sensory detail, accusation, wound, or object pulls the story backward.",
      type: "falling",
      transitions: [{ to: "exposition-flashback", weight: 1 }],
    },
    {
      id: "exposition-flashback",
      name: "Flashback to Exposition",
      description: "Reveal the earlier normal world and the first causes of the crisis.",
      type: "setup",
      transitions: [{ to: "escalating-past", weight: 1 }],
    },
    {
      id: "escalating-past",
      name: "Escalating Past",
      description: "Move forward through the earlier chain of choices and complications.",
      type: "rising",
      transitions: [
        { to: "escalating-past", weight: 0.2 },
        { to: "return-to-climax", weight: 0.8 },
      ],
    },
    {
      id: "return-to-climax",
      name: "Return to Climax",
      description: "Rejoin the opening moment with full context and renewed urgency.",
      type: "climax",
      transitions: [{ to: "resolution", weight: 1 }],
    },
    {
      id: "resolution",
      name: "Resolution",
      description: "Resolve the crisis in light of what the flashback changed about its meaning.",
      type: "resolution",
      transitions: [{ to: "opening-climax", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "opening-climax",
      afterBeat: "exposition-flashback",
      severity: "blocking",
      description: "The story must open in action before it explains the past.",
    },
    {
      type: "ordering",
      beforeBeat: "exposition-flashback",
      afterBeat: "return-to-climax",
      severity: "blocking",
      description: "Context should arrive before returning to the opening crisis.",
    },
    {
      type: "reference",
      ifBeat: "flashback-trigger",
      thenBeat: "return-to-climax",
      relation: "must_also_occur",
      severity: "warning",
      description: "The trigger should matter when the story returns to the present crisis.",
    },
  ],
};
