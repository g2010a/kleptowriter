import type { HarnessAdapter, AdapterConfig } from "@kleptowriter/kleptowriter-core/adapters/adapter";
import type { AgentRegistry } from "@kleptowriter/kleptowriter-core/agents/registry";

export type StandaloneCommand = "init" | "run" | "status";

const commands = new Set<StandaloneCommand>(["init", "run", "status"]);

export class StandaloneAdapter implements HarnessAdapter {
  readonly type = "standalone";
  private running = false;

  async init(config: AdapterConfig): Promise<void> {
    void config;
    // TODO: ponytail: stub until standalone harness initialization exists.
  }

  async registerAgents(registry: AgentRegistry): Promise<void> {
    void registry;
    // TODO: ponytail: stub until standalone agent registration exists.
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

export function parseStandaloneCommand(argv = process.argv): StandaloneCommand | undefined {
  return argv.find((arg): arg is StandaloneCommand => commands.has(arg as StandaloneCommand));
}

export async function runStandaloneCli(argv = process.argv): Promise<StandaloneCommand | undefined> {
  const command = parseStandaloneCommand(argv);
  // TODO: ponytail: dispatch kleptowriter init/run/status when standalone CLI integration exists.
  return command;
}
