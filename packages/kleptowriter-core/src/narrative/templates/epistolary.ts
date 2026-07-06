import type { NarrativeStructure } from "./types.js";

export const epistolary: NarrativeStructure = {
  name: "Epistolary",
  description: "A document-driven structure where letters, journals, articles, and transcripts reveal story through artifacts.",
  beats: [
    {
      id: "opening-letter",
      name: "Opening Letter",
      description: "A personal document establishes voice, desire, and the first gap between writer and reader.",
      type: "setup",
      transitions: [{ to: "journal-entry", weight: 1 }],
    },
    {
      id: "journal-entry",
      name: "Journal Entry",
      description: "A private record reveals what the public correspondence hides.",
      type: "rising",
      transitions: [
        { to: "news-article", weight: 0.6 },
        { to: "transcript", weight: 0.4 },
      ],
    },
    {
      id: "news-article",
      name: "News Article",
      description: "An external account reframes private events as public consequence.",
      type: "conflict",
      transitions: [{ to: "transcript", weight: 1 }],
    },
    {
      id: "transcript",
      name: "Transcript",
      description: "A recorded conversation exposes subtext through interruption, omission, and contradiction.",
      type: "climax",
      transitions: [{ to: "letter-response", weight: 1 }],
    },
    {
      id: "letter-response",
      name: "Letter Response",
      description: "A reply answers, denies, or weaponizes the earlier letter.",
      type: "falling",
      transitions: [
        { to: "final-document", weight: 0.85 },
        { to: "journal-entry", weight: 0.15 },
      ],
    },
    {
      id: "final-document",
      name: "Final Document",
      description: "The last artifact confirms what can be known and what remains missing.",
      type: "resolution",
      transitions: [{ to: "opening-letter", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "opening-letter",
      afterBeat: "letter-response",
      severity: "blocking",
      description: "A response must follow the letter it answers.",
    },
    {
      type: "reference",
      ifBeat: "news-article",
      thenBeat: "transcript",
      relation: "must_also_occur",
      severity: "warning",
      description: "Public claims should be tested by a more immediate record.",
    },
    {
      type: "occurrence",
      beatId: "final-document",
      exactCount: 1,
      severity: "info",
      description: "The final artifact should give the document trail a clear endpoint.",
    },
  ],
};
