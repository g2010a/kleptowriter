import { describe, it, expect, mock, beforeEach } from "bun:test";
import { allKleptowriterTools } from "./tools/registry.js";

// Mock Pi SDK modules before importing session
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
  subscribe: mock(() => () => {}),
  dispose: mock(() => {}),
  getActiveToolNames: mock(() => []),
};

const mockCreateAgentSessionServices = mock(async () => mockServices);
const mockCreateAgentSessionFromServices = mock(async () => ({
  session: mockSession,
  extensionsResult: {},
  modelFallbackMessage: undefined,
}));
const mockCreateAgentSessionRuntime = mock(async () => ({}));
const mockSessionManagerInMemory = mock(() => ({}));
const mockInteractiveModeInstance = { run: mock(async () => {}) };
const mockInteractiveModeConstructor = mock(
  function (this: Record<string, unknown>, runtime: unknown, opts: unknown) {
    this.runtime = runtime;
    this.options = opts;
    return mockInteractiveModeInstance;
  },
);

// Patch the module mock before importing session.ts
mock.module("@earendil-works/pi-coding-agent", () => ({
  createAgentSessionServices: mockCreateAgentSessionServices,
  createAgentSessionFromServices: mockCreateAgentSessionFromServices,
  createAgentSessionRuntime: mockCreateAgentSessionRuntime,
  SessionManager: { inMemory: mockSessionManagerInMemory, create: mock(() => ({})), },
  InteractiveMode: mockInteractiveModeConstructor,
}));

import { createTuiSession } from "./session.js";

// Helper: safely extract first call args from mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstCallArgs(mockFn: ReturnType<typeof mock<any>>): any {
  const call = mockFn.mock.calls[0];
  return call !== undefined ? call[0] : undefined;
}

beforeEach(() => {
  mockCreateAgentSessionServices.mockClear();
  mockCreateAgentSessionFromServices.mockClear();
  mockCreateAgentSessionRuntime.mockClear();
  mockSessionManagerInMemory.mockClear();
  mockInteractiveModeConstructor.mockClear();
  mockSession.subscribe.mockClear();
});

describe("createTuiSession", () => {
  it("calls createAgentSessionServices with resource loader options", async () => {
    await createTuiSession({ cwd: "/test/cwd" });

    expect(mockCreateAgentSessionServices).toHaveBeenCalledTimes(1);
    const args = firstCallArgs(mockCreateAgentSessionServices);
    expect(args.cwd).toBe("/test/cwd");
    expect(args.resourceLoaderOptions).toBeDefined();
    expect(args.resourceLoaderOptions!.noExtensions).toBe(true);
    expect(args.resourceLoaderOptions!.noSkills).toBe(true);
    expect(args.resourceLoaderOptions!.noPromptTemplates).toBe(true);
    expect(args.resourceLoaderOptions!.noThemes).toBe(true);
    expect(args.resourceLoaderOptions!.noContextFiles).toBe(true);
  });

  it("passes customTools: allKleptowriterTools to createAgentSessionFromServices", async () => {
    await createTuiSession();

    expect(mockCreateAgentSessionFromServices).toHaveBeenCalledTimes(1);
    const args = firstCallArgs(mockCreateAgentSessionFromServices);
    expect(args.customTools).toBe(allKleptowriterTools);
  });

  it("sets excludeTools: [bash] to disable bash while keeping other Pi coding tools", async () => {
    await createTuiSession();

    const args = firstCallArgs(mockCreateAgentSessionFromServices);
    expect(args.excludeTools).toEqual(["bash"]);
  });

  it("applies systemPromptOverride when provided", async () => {
    const customPrompt = "You are a custom writing assistant.";
    await createTuiSession({
      systemPromptOverride: () => customPrompt,
    });

    const args = firstCallArgs(mockCreateAgentSessionServices);
    const override = args.resourceLoaderOptions!.systemPromptOverride!;
    expect(override(undefined)).toBe(customPrompt);
  });

  it("uses default system prompt when no override is provided", async () => {
    await createTuiSession();

    const args = firstCallArgs(mockCreateAgentSessionServices);
    const override = args.resourceLoaderOptions!.systemPromptOverride!;
    const result = override(undefined);
    expect(typeof result).toBe("string");
    expect(result!.length).toBeGreaterThan(0);
  });

  it("returns an InteractiveMode instance", async () => {
    const result = await createTuiSession();
    expect(result).toBeDefined();
    expect(mockInteractiveModeConstructor).toHaveBeenCalledTimes(1);
  });
});

// ── Model compat mutation tests ─────────────────────────────────────────

describe("model compat mutation", () => {
  it("mutates deepseek-v4-flash-free compat with thinkingFormat and supportsReasoningEffort", async () => {
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

    await createTuiSession({ cwd: "/test/cwd" });

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

  it("does not crash when model not found in registry", async () => {
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

    await expect(createTuiSession({ cwd: "/test/cwd" })).resolves.toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateAgentSessionServices.mockImplementation(async () => mockServices as any);
  });
});
