import type { HarnessAdapter, AdapterConfig } from "@kleptowriter/kleptowriter-core/adapters/adapter";
import type { AgentRegistry } from "@kleptowriter/kleptowriter-core/agents/registry";

export class OpenCodeAdapter implements HarnessAdapter {
  readonly type = "opencode";
  private running = false;

  async init(config: AdapterConfig): Promise<void> {
    void config;
    // TODO: ponytail: stub until OpenCode harness integration exists.
  }

  async registerAgents(registry: AgentRegistry): Promise<void> {
    void registry;
    // TODO: ponytail: stub until OpenCode agent registration exists.
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}
