import {
  createAgentSessionServices,
  createAgentSessionFromServices,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import type { AgentSession, AgentSessionEventListener } from "@earendil-works/pi-coding-agent";
import { resolve } from "node:path";
import systemPrompt from "./prompt/system.md" with { type: "text" };
import { allKleptowriterTools, loadContextTool } from "./tools/registry.js";

const DEFAULT_AGENT_DIR = resolve(".omo/.pi-agent");

export interface KleptowriterSessionOptions {
  cwd?: string;
  agentDir?: string;
  sessionDir?: string;
  onEvent?: AgentSessionEventListener;
}

export interface KleptowriterSession {
  session: AgentSession;
  startupContext: unknown;
  unsubscribe: () => void;
}

export async function createKleptowriterSession(
  options: KleptowriterSessionOptions = {},
): Promise<KleptowriterSession> {
  const cwd = options.cwd ?? process.cwd();
  const sessionDir = options.sessionDir ?? resolve(cwd, "story", ".pi-session");

  const services = await createAgentSessionServices({
    cwd,
    agentDir: options.agentDir,
    resourceLoaderOptions: {
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPromptOverride: () => systemPrompt,
    },
  });

  // DeepSeek V4 OpenCode models: Pi SDK detectCompat() wrongly sets thinkingFormat: "openai"
  // for OpenCode provider because baseUrl check (deepseek.com) doesn't match opencode.ai.
  // Mutate live model registry entries to use deepseek thinkingFormat + disable reasoning_effort.
  const DEEPSEEK_V4_OPENCODE_MODELS = [
    "deepseek-v4-flash-free",
    "deepseek-v4-flash",
    "deepseek-v4-pro",
  ] as const;
  for (const modelId of DEEPSEEK_V4_OPENCODE_MODELS) {
    const model = services.modelRegistry.find("opencode", modelId);
    if (model) {
      model.compat = {
        ...model.compat,
        thinkingFormat: "deepseek" as const,
        supportsReasoningEffort: false,
      };
    }
  }

  const sessionManager = SessionManager.create(cwd, sessionDir);

  const { session } = await createAgentSessionFromServices({
    services,
    sessionManager,
    excludeTools: ["bash"],
    customTools: allKleptowriterTools,
  });

  // Auto-load context at startup — direct tool invocation, no LLM roundtrip
  const startupContext = await invokeLoadContext();

  let unsub = () => {};
  if (options.onEvent) {
    unsub = session.subscribe(options.onEvent);
  }

  return { session, startupContext, unsubscribe: unsub };
}

const GREETING = "Hello! I'm ready to start a new novel. Let's begin.";

function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY);
}

export async function startNovelSession(
  options: KleptowriterSessionOptions = {},
): Promise<KleptowriterSession> {
  const result = await createKleptowriterSession({
    cwd: options.cwd ?? process.cwd(),
    ...options,
  });

  if (hasApiKey()) {
    await result.session.prompt(GREETING);
  }

  return result;
}

async function invokeLoadContext(): Promise<unknown> {
  type StartupTool = {
    execute?: (
      toolCallId: string,
      params: { sceneCount: number },
      extensionContext?: unknown,
      operationContext?: unknown,
      abortSignal?: unknown,
    ) => Promise<{ details?: unknown } | null | undefined>;
  };

  const tool = loadContextTool as unknown as StartupTool;
  if (typeof tool.execute !== "function") return null;
  const result = await tool.execute("startup", { sceneCount: 5 }, undefined, undefined, undefined);
  return result?.details ?? null;
}
