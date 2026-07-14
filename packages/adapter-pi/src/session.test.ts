import { test, expect, describe, afterEach, mock } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EXPECTED_TOOLS = [
  "write_scene",
  "read_scene",
  "list_scenes",
  "query_bible",
  "update_bible",
  "evaluate_prose",
  "load_context",
  "suggest_next_beat",
  "deduce_chapters",
  "list_narrative_templates",
  "get_project_version",
  "web_search",
  "web_fetch",
];

const CODING_TOOLS = ["bash", "read", "write", "edit", "grep", "find", "ls"];

const CLEANUP_DIRS: string[] = [];
afterEach(async () => {
  for (const dir of CLEANUP_DIRS) {
    await rm(dir, { recursive: true, force: true });
  }
  CLEANUP_DIRS.length = 0;
});

async function tempAgentDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "kw-session-test-"));
  CLEANUP_DIRS.push(dir);
  return dir;
}

// ── Mock Pi SDK modules before importing session ──────────────────────────────
const mockServices = {
  cwd: "/test/cwd",
  agentDir: "/test/agentDir",
  authStorage: {},
  settingsManager: {},
  modelRegistry: {
    find() {
      return undefined;
    },
  },
  resourceLoader: {},
  diagnostics: [],
};

const mockSession = {
  getActiveToolNames: mock(() => EXPECTED_TOOLS),
  subscribe: mock(() => () => {}),
  dispose: mock(() => {}),
  systemPrompt:
    "You are a literary writing assistant with access to load_context, write_scene, and other tools.",
  prompt: mock(async () => {}),
};

const mockCreateAgentSessionServices = mock(async () => mockServices);
const mockCreateAgentSessionFromServices = mock(async () => ({
  session: mockSession,
  extensionsResult: {},
  modelFallbackMessage: undefined,
}));
const mockSessionManagerInMemory = mock(() => ({}));

mock.module("@earendil-works/pi-coding-agent", () => ({
  createAgentSessionServices: mockCreateAgentSessionServices,
  createAgentSessionFromServices: mockCreateAgentSessionFromServices,
  SessionManager: { inMemory: mockSessionManagerInMemory, create: mock(() => ({})) },
}));
// ── End Pi SDK mock ───────────────────────────────────────────────────────────

import { createKleptowriterSession, startNovelSession } from "./session.js";
import { allKleptowriterTools } from "./tools/registry.js";

// ── allKleptowriterTools (no mock needed — pure registry checks) ──────────────

describe("allKleptowriterTools", () => {
  test("exports exactly 13 tool definitions", () => {
    expect(allKleptowriterTools).toHaveLength(13);
  });

  test("all tools have expected names", () => {
    const names = allKleptowriterTools.map((t: { name: string }) => t.name);
    expect(names).toEqual(EXPECTED_TOOLS);
  });
});

// ── createKleptowriterSession ─────────────────────────────────────────────────

describe("createKleptowriterSession", () => {
  test("session registers exactly 9 Kleptowriter tools in active set", async () => {
    const agentDir = await tempAgentDir();
    const { session } = await createKleptowriterSession({ agentDir });
    try {
      const activeNames = session.getActiveToolNames();
      for (const name of EXPECTED_TOOLS) {
        expect(activeNames).toContain(name);
      }
      session.dispose();
    } catch (err) {
      session.dispose();
      throw err;
    }
  });

  test("session has zero built-in coding tools in active set", async () => {
    const agentDir = await tempAgentDir();
    const { session } = await createKleptowriterSession({ agentDir });
    try {
      const activeNames = session.getActiveToolNames();
      const foundBuiltin = activeNames.filter((n: string) => CODING_TOOLS.includes(n));
      expect(foundBuiltin).toEqual([]);
      session.dispose();
    } catch (err) {
      session.dispose();
      throw err;
    }
  });

  test("system prompt is loaded from system.md", async () => {
    const agentDir = await tempAgentDir();
    const { session } = await createKleptowriterSession({ agentDir });
    try {
      const prompt = session.systemPrompt;
      expect(prompt).toContain("literary writing assistant");
      expect(prompt).toContain("load_context");
      expect(prompt).toContain("write_scene");
      session.dispose();
    } catch (err) {
      session.dispose();
      throw err;
    }
  });

  test("startup context is returned from load_context auto-call", async () => {
    const agentDir = await tempAgentDir();
    const { startupContext } = await createKleptowriterSession({ agentDir });
    expect(startupContext).toBeDefined();
    const ctx = startupContext as { bible: unknown; recentScenes: unknown[] };
    expect(ctx).toHaveProperty("bible");
    expect(ctx).toHaveProperty("recentScenes");
    expect(Array.isArray(ctx.recentScenes)).toBe(true);
  });

  test("onEvent callback does not break session creation", async () => {
    const agentDir = await tempAgentDir();
    const events: unknown[] = [];
    const { session, unsubscribe } = await createKleptowriterSession({
      agentDir,
      onEvent: (e) => events.push(e),
    });
    try {
      expect(typeof unsubscribe).toBe("function");
      const activeNames = session.getActiveToolNames();
      expect(activeNames.length).toBeGreaterThan(0);
      unsubscribe();
      session.dispose();
    } catch (err) {
      unsubscribe();
      session.dispose();
      throw err;
    }
  });

  test("unsubscribe is a no-op when no onEvent provided", async () => {
    const agentDir = await tempAgentDir();
    const { session, unsubscribe } = await createKleptowriterSession({ agentDir });
    try {
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
      session.dispose();
    } catch (err) {
      session.dispose();
      throw err;
    }
  });
});

// ── startNovelSession ─────────────────────────────────────────────────────────

describe("startNovelSession", () => {
  test("returns a valid session offline (no API key required)", async () => {
    const agentDir = await tempAgentDir();
    const { session } = await startNovelSession({ agentDir });
    try {
      const activeNames = session.getActiveToolNames();
      expect(activeNames.length).toBeGreaterThan(0);
      session.dispose();
    } catch (err) {
      session.dispose();
      throw err;
    }
  });

  test("does not send greeting when no API key is present", async () => {
    const agentDir = await tempAgentDir();
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const { session } = await startNovelSession({ agentDir });
      expect(session).toBeDefined();
      session.dispose();
    } finally {
      if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
      if (originalOpenAI !== undefined) process.env.OPENAI_API_KEY = originalOpenAI;
    }
  });
});

// ── Model compat mutation tests ─────────────────────────────────────────

describe("model compat mutation", () => {
  test("mutates deepseek-v4-flash-free compat with thinkingFormat and supportsReasoningEffort", async () => {
    const deepseekFlashFree = {
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        maxTokensField: "max_tokens",
        requiresReasoningContentOnAssistantMessages: true,
      },
    };
    const deepseekFlash = {
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        maxTokensField: "max_tokens",
        supportsLongCacheRetention: false,
        requiresReasoningContentOnAssistantMessages: true,
      },
    };
    const deepseekPro = {
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        maxTokensField: "max_tokens",
        supportsLongCacheRetention: false,
        requiresReasoningContentOnAssistantMessages: true,
      },
    };
    const claudeModel: { compat: Record<string, unknown> } = {
      compat: { supportsStore: true, thinkingFormat: "anthropic" },
    };

    const modelMap = new Map<string, { compat: Record<string, unknown> }>([
      ["opencode:deepseek-v4-flash-free", deepseekFlashFree],
      ["opencode:deepseek-v4-flash", deepseekFlash],
      ["opencode:deepseek-v4-pro", deepseekPro],
      ["anthropic:claude-sonnet-4-5", claudeModel],
    ]);

    const patchedServices = {
      ...mockServices,
      modelRegistry: {
        find(provider: string, modelId: string) {
          return modelMap.get(`${provider}:${modelId}`);
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAgentSessionServices.mockImplementation(async () => patchedServices as any);

    const agentDir = await tempAgentDir();
    await createKleptowriterSession({ agentDir });

    const flashFreeCompat = deepseekFlashFree.compat as Record<string, unknown>;
    expect(flashFreeCompat.thinkingFormat).toBe("deepseek");
    expect(flashFreeCompat.supportsReasoningEffort).toBe(false);
    expect(flashFreeCompat.supportsStore).toBe(false);

    const flashCompat = deepseekFlash.compat as Record<string, unknown>;
    expect(flashCompat.thinkingFormat).toBe("deepseek");
    expect(flashCompat.supportsReasoningEffort).toBe(false);
    expect(flashCompat.supportsLongCacheRetention).toBe(false);

    const proCompat = deepseekPro.compat as Record<string, unknown>;
    expect(proCompat.thinkingFormat).toBe("deepseek");
    expect(proCompat.supportsReasoningEffort).toBe(false);
    expect(proCompat.supportsLongCacheRetention).toBe(false);

    expect(claudeModel.compat.thinkingFormat).toBe("anthropic");
    expect(claudeModel.compat).not.toHaveProperty("supportsReasoningEffort");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAgentSessionServices.mockImplementation(async () => mockServices as any);
  });

  test("does not crash when model not found in registry", async () => {
    const patchedServices = {
      ...mockServices,
      modelRegistry: {
        find() {
          return undefined;
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAgentSessionServices.mockImplementation(async () => patchedServices as any);

    const agentDir = await tempAgentDir();
    await expect(createKleptowriterSession({ agentDir })).resolves.toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAgentSessionServices.mockImplementation(async () => mockServices as any);
  });
});
