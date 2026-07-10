import type { NarrativeStructure } from "./types.js";

export const heroinesJourney: NarrativeStructure = {
  name: "Heroine's Journey",
  description:
    "An internal integration arc — the heroine separates from the feminine to succeed in a patriarchal world, " +
    "achieves external success that proves hollow, descends into crisis, heals the split with the feminine, " +
    "and returns whole.",
  beats: [
    {
      id: "separation-from-feminine",
      name: "Separation from the Feminine",
      description:
        "The heroine distances herself from feminine-coded qualities — emotion, intuition, receptivity, " +
        "connection — to survive or advance in a world that rewards masculine-coded behaviour.",
      type: "setup",
      transitions: [{ to: "identification-with-masculine", weight: 1 }],
    },
    {
      id: "identification-with-masculine",
      name: "Identification with the Masculine",
      description:
        "She doubles down on ambition, control, competition, and independence. External validation " +
        "through achievement becomes her measure of worth.",
      type: "rising",
      transitions: [{ to: "road-of-trials", weight: 1 }],
    },
    {
      id: "road-of-trials",
      name: "Road of Trials",
      description:
        "She faces escalating challenges — discrimination, betrayal, ethical compromise, the cost of " +
        "her chosen path. Each trial reinforces or cracks the adopted identity.",
      type: "rising",
      transitions: [
        { to: "road-of-trials", weight: 0.25 },
        { to: "illusory-boon", weight: 0.55 },
        { to: "the-descent", weight: 0.2 },
      ],
    },
    {
      id: "illusory-boon",
      name: "Illusory Boon of Success",
      description:
        "She reaches the external goal — promotion, recognition, victory — only to find it " +
        "hollow. Something essential was lost in the winning.",
      type: "climax",
      transitions: [{ to: "the-descent", weight: 1 }],
    },
    {
      id: "the-descent",
      name: "The Descent",
      description:
        "A crisis — loss, betrayal, illness, burnout, spiritual emptiness — forces her to " +
        "confront what she suppressed. The old identity shatters.",
      type: "conflict",
      transitions: [
        { to: "yearning-for-reconnection", weight: 0.7 },
        { to: "the-descent", weight: 0.3 },
      ],
    },
    {
      id: "yearning-for-reconnection",
      name: "Urgent Yearning for Reconnection",
      description:
        "She desperately seeks to reconnect with her authentic self, body, intuition, relationships, " +
        "and the feminine principle she abandoned.",
      type: "falling",
      transitions: [
        { to: "healing-mother-daughter", weight: 0.6 },
        { to: "the-descent", weight: 0.4 },
      ],
    },
    {
      id: "healing-mother-daughter",
      name: "Healing the Mother-Daughter Split",
      description:
        "She confronts her relationship with the feminine — often through the mother, through " +
        "other women, or through her own body and intuition. Old wounds begin to mend.",
      type: "rising",
      transitions: [
        { to: "healing-mother-daughter", weight: 0.2 },
        { to: "finding-inner-masculine", weight: 0.6 },
        { to: "integration", weight: 0.2 },
      ],
    },
    {
      id: "finding-inner-masculine",
      name: "Finding the Inner Masculine",
      description:
        "She reclaims a healthy, authentic masculine principle — discernment, agency, boundaries — " +
        "that serves her wholeness rather than dominating it.",
      type: "rising",
      transitions: [{ to: "integration", weight: 1 }],
    },
    {
      id: "integration",
      name: "Integration",
      description:
        "The inner marriage. Masculine and feminine aspects operate together. She acts from " +
        "wholeness and internal authority, not from compensation or proving.",
      type: "climax",
      transitions: [{ to: "return-to-world", weight: 1 }],
    },
    {
      id: "return-to-world",
      name: "Return to the World",
      description:
        "She brings her integrated self back to community. Contribution replaces ambition. " +
        "The cycle can begin again at a deeper level.",
      type: "resolution",
      transitions: [{ to: "separation-from-feminine", weight: 1 }],
    },
  ],
  constraints: [
    {
      type: "ordering",
      beforeBeat: "separation-from-feminine",
      afterBeat: "the-descent",
      severity: "blocking",
      description: "The descent only hits after she has separated from the feminine and succeeded on external terms.",
    },
    {
      type: "ordering",
      beforeBeat: "illusory-boon",
      afterBeat: "the-descent",
      severity: "blocking",
      description: "The hollow boon triggers the descent — success must precede the crash.",
    },
    {
      type: "ordering",
      beforeBeat: "healing-mother-daughter",
      afterBeat: "integration",
      severity: "blocking",
      description: "The split with the feminine must be healed before true integration is possible.",
    },
    {
      type: "ordering",
      beforeBeat: "finding-inner-masculine",
      afterBeat: "integration",
      severity: "blocking",
      description: "The authentic masculine must be recovered before the inner marriage.",
    },
    {
      type: "reference",
      ifBeat: "the-descent",
      thenBeat: "healing-mother-daughter",
      relation: "must_also_occur",
      severity: "warning",
      description: "A genuine descent should lead toward healing the feminine split, not just suffering.",
    },
    {
      type: "reference",
      ifBeat: "identification-with-masculine",
      thenBeat: "the-descent",
      relation: "must_also_occur",
      severity: "warning",
      description: "Over-identification with the masculine must eventually be confronted through descent.",
    },
    {
      type: "occurrence",
      beatId: "integration",
      exactCount: 1,
      severity: "warning",
      description: "The integration beat represents a singular transformative synthesis.",
    },
    {
      type: "tension",
      beatId: "the-descent",
      minTension: 0.8,
      severity: "warning",
      description: "The descent holds the story's lowest emotional point.",
    },
  ],
};
