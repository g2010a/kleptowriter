import { expect, test } from "bun:test";
import { ConflictResolution, type Vote } from "./conflict-resolution.js";

test("weighted voting produces the aggregate verdict", () => {
  const resolver = new ConflictResolution();
  const result = resolver.resolveViaWeightedVoting({
    votes: [
      { agentId: "plot", verdict: "pass", confidence: 8, reasoning: "works" },
      { agentId: "style", verdict: "conditional", confidence: 7, reasoning: "minor edits" },
      { agentId: "canon", verdict: "reject", confidence: 9, reasoning: "continuity break" },
    ],
    weights: new Map([
      ["plot", 2],
      ["style", 1],
      ["canon", 1],
    ]),
  });

  expect(result.score).toBe(6.25);
  expect(result.verdict).toBe("conditional");
});

test("lead agent resolves boundary ties", () => {
  const resolver = new ConflictResolution();
  const votes: Vote[] = [
    { agentId: "lead", verdict: "pass", confidence: 9, reasoning: "acceptable risk" },
    { agentId: "critic", verdict: "conditional", confidence: 9, reasoning: "needs review" },
  ];

  const weighted = resolver.resolveViaWeightedVoting({
    votes,
    weights: new Map([
      ["lead", 1],
      ["critic", 1],
    ]),
  });

  expect(weighted.score).toBe(7.5);
  expect(weighted.details).toContain("lead-agent");
  expect(resolver.resolveViaLeadAgent(votes, "lead").verdict).toBe("pass");
});
