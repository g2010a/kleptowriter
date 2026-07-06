import type { NarrativeStructure } from "./types.js";

export const circular: NarrativeStructure = {
  name: "Circular",
  description: "A return-based structure where the ending revisits the beginning with transformed meaning.",
  beats: [
    {
      id: "opening-return-point",
      name: "Opening Return Point",
      description: "Begin with an image, place, phrase, or ritual that can be returned to later.",
      type: "setup",
      transitions: [{ to: "departure", weight: 1 }],
    },
    {
      id: "departure",
      name: "Departure",
      description: "Leave the initial state physically, emotionally, or morally.",
      type: "rising",
      transitions: [{ to: "variation", weight: 1 }],
    },
    {
      id: "variation",
      name: "Variation",
      description: "Encounter echoes of the opening in altered forms.",
      type: "rising",
      transitions: [
        { to: "rupture", weight: 0.8 },
        { to: "variation", weight: 0.2 },
      ],
    },
    {
      id: "rupture",
      name: "Rupture",
      description: "Break the apparent pattern so return becomes uncertain.",
      type: "conflict",
      transitions: [{ to: "recognition", weight: 1 }],
    },
    {
      id: "recognition",
      name: "Recognition",
      description: "The protagonist understands what the opening sign truly meant.",
      type: "climax",
      transitions: [{ to: "altered-return", weight: 1 }],
    },
    {
      id: "altered-return",
      name: "Altered Return",
      description: "Return to the opening point changed enough that sameness feels new.",
      type: "resolution",
      transitions: [{ to: "opening-return-point", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "opening-return-point",
      afterBeat: "altered-return",
      severity: "blocking",
      description: "The final return must revisit something established at the start.",
    },
    {
      type: "reference",
      ifBeat: "departure",
      thenBeat: "altered-return",
      relation: "must_also_occur",
      severity: "warning",
      description: "The return should reveal what departure changed.",
    },
    {
      type: "distance",
      beatA: "opening-return-point",
      beatB: "altered-return",
      maxScenesApart: 12,
      severity: "info",
      description: "Keep the opening echo close enough in memory for the circular effect to land.",
    },
  ],
};
