import type { NarrativeStructure } from "./types.js";

export const freytagsPyramid: NarrativeStructure = {
  name: "Freytag's Pyramid",
  description: "A classic five-part dramatic arc that builds toward a central climax and then resolves consequences.",
  beats: [
    {
      id: "exposition",
      name: "Exposition",
      description: "Introduce the situation, characters, stakes, and latent tensions.",
      type: "setup",
      transitions: [{ to: "rising-action", weight: 1 }],
    },
    {
      id: "rising-action",
      name: "Rising Action",
      description: "Complications intensify and narrow the path toward decisive conflict.",
      type: "rising",
      transitions: [
        { to: "rising-action", weight: 0.2 },
        { to: "climax", weight: 0.8 },
      ],
    },
    {
      id: "climax",
      name: "Climax",
      description: "The central confrontation forces the decisive turn of the story.",
      type: "climax",
      transitions: [{ to: "falling-action", weight: 1 }],
    },
    {
      id: "falling-action",
      name: "Falling Action",
      description: "Consequences spread outward as conflicts unwind.",
      type: "falling",
      transitions: [{ to: "denouement", weight: 1 }],
    },
    {
      id: "denouement",
      name: "Denouement",
      description: "The new order is revealed and emotional accounts are settled.",
      type: "resolution",
      transitions: [{ to: "exposition", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "exposition",
      afterBeat: "climax",
      severity: "blocking",
      description: "Readers need the dramatic situation before its decisive reversal.",
    },
    {
      type: "ordering",
      beforeBeat: "climax",
      afterBeat: "denouement",
      severity: "blocking",
      description: "Resolution follows the climactic turn rather than preceding it.",
    },
    {
      type: "tension",
      beatId: "climax",
      minTension: 0.85,
      severity: "warning",
      description: "The climax should carry the story's highest tension.",
    },
  ],
};
