import type { NarrativeStructure } from "./types.js";

export const threeActStructure: NarrativeStructure = {
  name: "Three-Act Structure",
  description: "A broad commercial arc with setup, confrontation, and resolution separated by decisive act breaks.",
  beats: [
    {
      id: "setup",
      name: "Setup",
      description: "Establish the protagonist, world, desire, flaw, and ordinary pressure.",
      type: "setup",
      transitions: [{ to: "inciting-incident", weight: 1 }],
    },
    {
      id: "inciting-incident",
      name: "Inciting Incident",
      description: "A disruption creates the dramatic question the story must answer.",
      type: "conflict",
      transitions: [{ to: "act-one-break", weight: 1 }],
    },
    {
      id: "act-one-break",
      name: "Act One Break",
      description: "The protagonist commits to a goal that changes the story's arena.",
      type: "rising",
      transitions: [{ to: "confrontation", weight: 1 }],
    },
    {
      id: "confrontation",
      name: "Confrontation",
      description: "Opposition escalates as plans fail and the cost of desire rises.",
      type: "rising",
      transitions: [
        { to: "midpoint", weight: 0.7 },
        { to: "confrontation", weight: 0.3 },
      ],
    },
    {
      id: "midpoint",
      name: "Midpoint Reversal",
      description: "A false victory or false defeat reframes the goal and stakes.",
      type: "climax",
      transitions: [{ to: "act-two-break", weight: 1 }],
    },
    {
      id: "act-two-break",
      name: "Act Two Break",
      description: "The protagonist hits a low point and chooses the final strategy.",
      type: "falling",
      transitions: [{ to: "resolution", weight: 1 }],
    },
    {
      id: "resolution",
      name: "Resolution",
      description: "The final confrontation answers the dramatic question and reveals change.",
      type: "resolution",
      transitions: [{ to: "setup", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "act-one-break",
      afterBeat: "confrontation",
      severity: "blocking",
      description: "Act Two begins only after the protagonist commits past the first threshold.",
    },
    {
      type: "ordering",
      beforeBeat: "midpoint",
      afterBeat: "act-two-break",
      severity: "blocking",
      description: "The second act break should respond to the midpoint reversal.",
    },
    {
      type: "occurrence",
      beatId: "resolution",
      exactCount: 1,
      severity: "warning",
      description: "A three-act story should resolve its primary dramatic question once.",
    },
  ],
};
