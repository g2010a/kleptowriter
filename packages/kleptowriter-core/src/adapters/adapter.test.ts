import { expect, test } from "bun:test";
import type { AgentRegistry } from "../agents/registry.js";
import type { AdapterConfig, HarnessAdapter } from "./adapter.js";

class MockHarnessAdapter implements HarnessAdapter {
  readonly type = "standalone" as const;

  public config?: AdapterConfig;
  public registry?: AgentRegistry;
  private running = false;

  async init(config: AdapterConfig): Promise<void> {
    this.config = config;
  }

  async registerAgents(registry: AgentRegistry): Promise<void> {
    this.registry = registry;
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

test("HarnessAdapter lifecycle", async () => {
  const adapter = new MockHarnessAdapter();
  const registry = {} as AgentRegistry;
  const config: AdapterConfig = {
    harnessType: "standalone",
    pluginPath: "/tmp/plugin.ts",
    agentMap: { narrator: "agent-1" },
  };

  expect(adapter.type).toBe("standalone");
  expect(adapter.isRunning()).toBe(false);

  await adapter.init(config);
  await adapter.registerAgents(registry);
  await adapter.start();

  expect(adapter.config).toEqual(config);
  expect(adapter.registry).toBe(registry);
  expect(adapter.isRunning()).toBe(true);

  await adapter.stop();

  expect(adapter.isRunning()).toBe(false);
});
