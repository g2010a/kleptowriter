import type { AgentRegistry } from "../agents/registry.js";

export type HarnessType = "opencode" | "codex" | "claude-code" | "standalone";

export interface AdapterConfig {
  harnessType: HarnessType;
  pluginPath?: string;
  agentMap?: Record<string, string>;
}

export interface HarnessAdapter {
  readonly type: HarnessType;
  init(config: AdapterConfig): Promise<void>;
  registerAgents(registry: AgentRegistry): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
