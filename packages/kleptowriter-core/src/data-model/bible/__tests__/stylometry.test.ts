import { expect, test } from "bun:test";
import type { StylometryProfile, StoryBible } from "../interfaces.js";

test("StylometryProfile accepts all 12 optional string fields", () => {
  const profile: StylometryProfile = {
    narrativeVoice: "omniscient",
    povStyle: "single viewpoint",
    tensePreference: "past",
    vocabularyRegister: "literary",
    sentenceLengthTarget: "varied",
    proseStyleNotes: "Lyrical prose with attention to sensory detail",
    dialogueStyleNotes: "Naturalistic dialogue with subtext",
    pacingPreference: "measured",
    paragraphStructure: "mixed",
    rhetoricalDevices: "metaphor, imagery",
    commaStyle: "oxford comma",
    dialogueTagPreference: "said-only",
  };

  expect(profile.narrativeVoice).toBe("omniscient");
  expect(profile.povStyle).toBe("single viewpoint");
  expect(profile.tensePreference).toBe("past");
  expect(profile.vocabularyRegister).toBe("literary");
  expect(profile.sentenceLengthTarget).toBe("varied");
  expect(profile.proseStyleNotes).toBe("Lyrical prose with attention to sensory detail");
  expect(profile.dialogueStyleNotes).toBe("Naturalistic dialogue with subtext");
  expect(profile.pacingPreference).toBe("measured");
  expect(profile.paragraphStructure).toBe("mixed");
  expect(profile.rhetoricalDevices).toBe("metaphor, imagery");
  expect(profile.commaStyle).toBe("oxford comma");
  expect(profile.dialogueTagPreference).toBe("said-only");
});

test("StylometryProfile allows partial fields (all optional)", () => {
  const partialProfile: StylometryProfile = {
    narrativeVoice: "first-person",
    tensePreference: "present",
  };

  expect(partialProfile.narrativeVoice).toBe("first-person");
  expect(partialProfile.tensePreference).toBe("present");
  expect(partialProfile.povStyle).toBeUndefined();
  expect(partialProfile.vocabularyRegister).toBeUndefined();
});

test("StylometryProfile allows empty object", () => {
  const emptyProfile: StylometryProfile = {};
  expect(emptyProfile).toEqual({});
});

test("StoryBible accepts optional stylometry field", () => {
  const bible: StoryBible = {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    chronology: [],
    arcs: new Map(),
    plotThreads: new Map(),
    dramaticQuestions: new Map(),
    knowledgeState: {
      knows: () => false,
      learn: () => {},
      queryFactsByCharacter: () => [],
      allFacts: () => new Map(),
    },
    thematicProgression: {
      themes: new Map(),
      getIntensity: () => 0,
      recordIntensity: () => {},
    },
    stylometry: {
      narrativeVoice: "close third",
      pacingPreference: "slow burn",
    },
  };

  expect(bible.stylometry).toBeDefined();
  expect(bible.stylometry?.narrativeVoice).toBe("close third");
  expect(bible.stylometry?.pacingPreference).toBe("slow burn");
});

test("StoryBible works without stylometry field", () => {
  const bible: StoryBible = {
    characters: new Map(),
    locations: new Map(),
    items: new Map(),
    chronology: [],
    arcs: new Map(),
    plotThreads: new Map(),
    dramaticQuestions: new Map(),
    knowledgeState: {
      knows: () => false,
      learn: () => {},
      queryFactsByCharacter: () => [],
      allFacts: () => new Map(),
    },
    thematicProgression: {
      themes: new Map(),
      getIntensity: () => 0,
      recordIntensity: () => {},
    },
  };

  expect(bible.stylometry).toBeUndefined();
});