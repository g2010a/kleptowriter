import type { NarrativeStructure } from "./types.js";

export const kishotenketsu: NarrativeStructure = {
  name: "Kishotenketsu",
  description: "A four-part structure built on introduction, development, twist, and harmonious reconciliation without requiring conflict.",
  beats: [
    {
      id: "introduction",
      name: "Introduction",
      description: "Present the subject, relationship, place, or pattern in a calm first state.",
      type: "setup",
      transitions: [{ to: "development", weight: 1 }],
    },
    {
      id: "development",
      name: "Development",
      description: "Elaborate the initial material through variation, deepening, or accumulation.",
      type: "rising",
      transitions: [
        { to: "twist", weight: 0.85 },
        { to: "development", weight: 0.15 },
      ],
    },
    {
      id: "twist",
      name: "Twist",
      description: "Introduce a surprising contrast that changes the reader's interpretation.",
      type: "climax",
      transitions: [{ to: "reconciliation", weight: 1 }],
    },
    {
      id: "reconciliation",
      name: "Reconciliation",
      description: "Join the original pattern and twist into a satisfying new understanding.",
      type: "resolution",
      transitions: [{ to: "introduction", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "development",
      afterBeat: "twist",
      severity: "blocking",
      description: "The twist lands only after the original pattern has been developed.",
    },
    {
      type: "ordering",
      beforeBeat: "twist",
      afterBeat: "reconciliation",
      severity: "blocking",
      description: "The final movement must integrate the surprise rather than ignore it.",
    },
    {
      type: "tension",
      beatId: "twist",
      maxTension: 0.7,
      severity: "info",
      description: "Kishotenketsu can surprise without making conflict the engine.",
    },
  ],
};
