import type { NarrativeStructure } from "./types.js";

export const nonlinear: NarrativeStructure = {
  name: "Nonlinear",
  description: "A fractured chronology that interleaves timelines so meaning accumulates by juxtaposition rather than sequence.",
  beats: [
    {
      id: "present-fracture",
      name: "Present Fracture",
      description: "Open on a present-day rupture whose causes are hidden.",
      type: "climax",
      transitions: [
        { to: "past-origin", weight: 0.55 },
        { to: "future-echo", weight: 0.45 },
      ],
    },
    {
      id: "past-origin",
      name: "Past Origin",
      description: "Jump back to the first buried choice, wound, or promise.",
      type: "setup",
      transitions: [
        { to: "present-aftermath", weight: 0.6 },
        { to: "missing-night", weight: 0.4 },
      ],
    },
    {
      id: "future-echo",
      name: "Future Echo",
      description: "Show a later consequence before its cause is understood.",
      type: "falling",
      transitions: [
        { to: "past-origin", weight: 0.5 },
        { to: "parallel-memory", weight: 0.5 },
      ],
    },
    {
      id: "present-aftermath",
      name: "Present Aftermath",
      description: "Return to the current fallout with one new piece of context.",
      type: "falling",
      transitions: [
        { to: "parallel-memory", weight: 0.5 },
        { to: "future-echo", weight: 0.5 },
      ],
    },
    {
      id: "parallel-memory",
      name: "Parallel Memory",
      description: "A second viewpoint reinterprets a known event from another timeline.",
      type: "rising",
      transitions: [
        { to: "missing-night", weight: 0.65 },
        { to: "future-echo", weight: 0.35 },
      ],
    },
    {
      id: "missing-night",
      name: "Missing Night",
      description: "Circle the central gap without fully exposing it yet.",
      type: "conflict",
      transitions: [
        { to: "false-cause", weight: 0.55 },
        { to: "present-reckoning", weight: 0.45 },
      ],
    },
    {
      id: "false-cause",
      name: "False Cause",
      description: "Offer an explanation that seems to solve chronology but later cracks.",
      type: "rising",
      transitions: [
        { to: "future-consequence", weight: 0.6 },
        { to: "reordered-truth", weight: 0.4 },
      ],
    },
    {
      id: "future-consequence",
      name: "Future Consequence",
      description: "Leap ahead to show the cost of the false explanation.",
      type: "falling",
      transitions: [{ to: "reordered-truth", weight: 1 }],
    },
    {
      id: "reordered-truth",
      name: "Reordered Truth",
      description: "Reassemble the fractured events so the true cause snaps into focus.",
      type: "climax",
      transitions: [{ to: "present-reckoning", weight: 1 }],
    },
    {
      id: "present-reckoning",
      name: "Present Reckoning",
      description: "The characters act in the present with the newly ordered truth.",
      type: "resolution",
      transitions: [{ to: "present-fracture", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "occurrence",
      beatId: "present-fracture",
      minCount: 1,
      severity: "blocking",
      description: "A nonlinear story needs a present anchor for the fractured sequence.",
    },
    {
      type: "ordering",
      beforeBeat: "missing-night",
      afterBeat: "reordered-truth",
      severity: "blocking",
      description: "The central gap should be withheld before it is reassembled.",
    },
    {
      type: "reference",
      ifBeat: "false-cause",
      thenBeat: "reordered-truth",
      relation: "must_also_occur",
      severity: "warning",
      description: "A false explanation needs a later correction to avoid reader confusion.",
    },
  ],
};
