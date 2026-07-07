import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import type { AgentSession, AgentSessionEventListener } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allKleptowriterTools, loadContextTool } from "./tools/registry.js";

const ADAPTER_DIR = import.meta.dirname ?? resolve("packages/adapter-pi/src");
const SYSTEM_PROMPT_PATH = resolve(ADAPTER_DIR, "prompt/system.md");
const DEFAULT_AGENT_DIR = resolve(".omo/.pi-agent");

// ponytail: reads file at module load time. Single session, file never changes mid-run.
const systemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");

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
  // ponytail: cast to any — execute requires 5 args including ExtensionContext,
  // but our tool implementations only use (toolCallId, params).
  const tool = loadContextTool as any;
  if (typeof tool.execute !== "function") return null;
  const result = await tool.execute("startup", { sceneCount: 5 }, undefined, undefined, undefined);
  return result?.details ?? null;
}
