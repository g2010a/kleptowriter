import {
  createAgentSession,
  DefaultResourceLoader,
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
  sessionManager?: SessionManager;
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
  const agentDir = options.agentDir ?? DEFAULT_AGENT_DIR;

  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPromptOverride: () => systemPrompt,
  });

  await loader.reload();

  const sm = options.sessionManager ?? SessionManager.inMemory();

  const { session } = await createAgentSession({
    noTools: "builtin",
    customTools: allKleptowriterTools,
    resourceLoader: loader,
    sessionManager: sm,
    cwd,
    agentDir,
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
