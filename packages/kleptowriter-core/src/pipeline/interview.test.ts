import { expect, test } from "bun:test";
import type { LiteraryAgent } from "../agents/types.js";
import { AgentRole } from "../types/enums.js";
import { InterviewProtocol } from "./interview.js";

const agents: LiteraryAgent[] = [
  {
    id: "editor",
    role: AgentRole.Editor,
    capabilityTier: ["evaluation"],
    mode: "evaluation",
    canEvaluate: true,
    canGenerate: false,
    setStoryContext: () => {},
  },
  {
    id: "critic",
    role: AgentRole.Critic,
    capabilityTier: ["evaluation"],
    mode: "evaluation",
    canEvaluate: true,
    canGenerate: false,
    setStoryContext: () => {},
  },
];

test("InterviewProtocol rejects shallow or incomplete responses at the gate", () => {
  const protocol = new InterviewProtocol(agents);
  const summary = protocol.runInterview(
    new Map([
      ["character-core-wound", "A thief wants redemption."],
      ["plot-conflict", "A rival appears."],
    ]),
  );

  expect(summary.gateApproved).toBe(false);
  expect(summary.overallDepthScore).toBeLessThan(7);
  expect(summary.assessments.every((assessment) => !assessment.approved)).toBe(true);
  expect(summary.assessments[0]?.concerns).toContain("Missing required theme answer: theme-question");
});

test("InterviewProtocol approves Phase 2 only when every agent approves depth", () => {
  const protocol = new InterviewProtocol(agents);
  const answers = new Map([
    [
      "character-core-wound",
      "Ada is a retired archive thief who wants forgiveness from the sister she betrayed during their last impossible job.",
    ],
    [
      "plot-conflict",
      "A patron blackmails Ada into stealing a living manuscript before it rewrites the city and erases everyone who remembers the truth.",
    ],
    [
      "theme-question",
      "The story asks whether repair is still meaningful when the harm cannot be undone and memory itself can be edited.",
    ],
    [
      "setting-pressure",
      "It unfolds in a rainlocked library-city where contracts are tattooed onto skin and every district is indexed by secret-keeping guilds.",
    ],
    [
      "tone-promise",
      "The tone should feel intimate, eerie, and morally tense, with moments of dry wit cutting through the dread.",
    ],
  ]);
  const summary = protocol.runInterview(answers);

  expect(summary.gateApproved).toBe(true);
  expect(summary.overallDepthScore).toBe(10);
  expect(summary.assessments.every((assessment) => assessment.approved)).toBe(true);
  expect(protocol.evaluateGate(summary)).toBe(true);
});
