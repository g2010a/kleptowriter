import type { LiteraryAgent } from "./types.js";
import { AgentRole } from "../types/enums.js";
import { Mailbox } from "../mailbox/mailbox.js";
import type { MailboxMessage } from "../mailbox/types.js";

const PLAN_EVALUATOR_ROLES = new Set<AgentRole>([
  AgentRole.Narratologist,
  AgentRole.PacingAnalyst,
  AgentRole.CharacterConsistency,
  AgentRole.ThematicCoherence,
  AgentRole.Worldbuilding,
  AgentRole.MoodTensionCurator,
]);

export class AgentRegistry {
  private readonly agents = new Map<string, LiteraryAgent>();

  constructor(private readonly mailbox: Mailbox) {}

  register(agent: LiteraryAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`);
    }

    this.agents.set(agent.id, agent);
    this.mailbox.registerAgent(agent.id);
  }

  unregister(agentId: string): void {
    this.agents.delete(agentId);
    this.mailbox.unregisterAgent(agentId);
  }

  resolve(role: AgentRole): LiteraryAgent | undefined {
    return [...this.agents.values()].find((agent) => agent.role === role);
  }

  resolveAll(role: AgentRole): LiteraryAgent[] {
    return [...this.agents.values()].filter((agent) => agent.role === role);
  }

  getAgent(agentId: string): LiteraryAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): LiteraryAgent[] {
    return [...this.agents.values()];
  }

  getEvaluatorsForGate(gateType: "plan" | "prose"): LiteraryAgent[] {
    return [...this.agents.values()].filter((agent) => {
      if (!agent.canEvaluate) {
        return false;
      }

      return gateType === "prose" || PLAN_EVALUATOR_ROLES.has(agent.role);
    });
  }

  broadcastToAll(message: Omit<MailboxMessage, "id" | "timestamp" | "to" | "from">): MailboxMessage[] {
    return this.getAllAgents().map((agent) =>
      this.mailbox.deliver(
        { agentId: agent.id },
        {
          ...message,
          from: { agentId: "registry" },
          to: { agentId: agent.id },
        },
      ),
    );
  }

  countByRole(): Map<AgentRole, number> {
    const counts = new Map<AgentRole, number>();

    for (const agent of this.agents.values()) {
      counts.set(agent.role, (counts.get(agent.role) ?? 0) + 1);
    }

    return counts;
  }
}
