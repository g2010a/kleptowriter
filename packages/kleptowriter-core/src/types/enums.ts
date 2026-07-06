export enum SceneStatus {
  Outline = 0,
  Rough = 1,
  Draft = 2,
  Revised = 3,
  Done = 4,
}

export enum AgentRole {
  Writer = 0,
  Editor = 1,
  Critic = 2,
  Ideator = 3,
  Researcher = 4,
  FactChecker = 5,
  Localizer = 6,
  Narratologist = 7,
  PacingAnalyst = 8,
  CharacterConsistency = 9,
  ThematicCoherence = 10,
  Worldbuilding = 11,
  Dialogist = 12,
  Stylesheet = 13,
  MoodTensionCurator = 14,
  NarrativeConsistency = 15,
  Archivist = 16,
}

export enum ConflictResolutionTier {
  WeightedVoting = 0,
  LeadAgent = 1,
  HumanInTheLoop = 2,
}
