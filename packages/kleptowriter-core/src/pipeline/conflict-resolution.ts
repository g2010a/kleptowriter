import type { EvaluationVerdict } from "../types/scene.js";

export interface Vote {
  agentId: string;
  verdict: EvaluationVerdict;
  confidence: number; // 0-10
  reasoning: string;
}

export interface WeightedVotingConfig {
  votes: Vote[];
  weights: Map<string, number>;
}

export interface EscalationContext {
  phase: string;
  issue: string;
  votes: Vote[];
  weightedResult?: EvaluationVerdict;
  recommendation?: string;
}

const verdictScores: Record<EvaluationVerdict, number> = {
  pass: 10,
  conditional: 5,
  reject: 0,
};

function verdictFromScore(score: number): EvaluationVerdict {
  if (score > 7.5) return "pass";
  if (score < 2.5) return "reject";
  return "conditional";
}

export class ConflictResolution {
  resolveViaWeightedVoting(config: WeightedVotingConfig): {
    verdict: EvaluationVerdict;
    score: number;
    details: string;
  } {
    const totalWeight = config.votes.reduce(
      (sum, vote) => sum + (config.weights.get(vote.agentId) ?? 1),
      0,
    );

    if (totalWeight === 0) {
      return {
        verdict: "conditional",
        score: 5,
        details: "No weighted votes available; escalate to lead-agent.",
      };
    }

    const score =
      config.votes.reduce((sum, vote) => {
        const weight = config.weights.get(vote.agentId) ?? 1;
        return sum + verdictScores[vote.verdict] * weight;
      }, 0) / totalWeight;
    const verdict = verdictFromScore(score);
    const atBoundary = score === 2.5 || score === 7.5;

    return {
      verdict,
      score,
      details: atBoundary
        ? `Weighted score ${score} is on a verdict boundary; escalate to lead-agent.`
        : `Weighted score ${score} resolved to ${verdict}.`,
    };
  }

  resolveViaLeadAgent(votes: Vote[], leadAgentId: string): Vote {
    const leadVote = votes.find((vote) => vote.agentId === leadAgentId);

    if (!leadVote) {
      throw new Error(`Lead agent vote not found: ${leadAgentId}`);
    }

    return leadVote;
  }

  escalateToHuman(context: EscalationContext): string {
    const votes = context.votes
      .map(
        (vote) =>
          `- ${vote.agentId}: ${vote.verdict} (${vote.confidence}/10) - ${vote.reasoning}`,
      )
      .join("\n");

    return [
      `Human review required for ${context.phase}.`,
      `Issue: ${context.issue}`,
      context.weightedResult ? `Weighted result: ${context.weightedResult}` : undefined,
      context.recommendation ? `Recommendation: ${context.recommendation}` : undefined,
      "Votes:",
      votes || "- No votes recorded.",
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }
}
