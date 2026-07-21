import {
  createAgentSessionServices,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  SessionManager,
  InteractiveMode,
} from "@earendil-works/pi-coding-agent";
import type { AgentSessionEventListener, ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { allKleptowriterTools, setMetadata } from "./tools/registry.js";
import { loadMetadata } from "./metadata/persistence.js";
import { join } from "node:path";
import systemPrompt from "./prompt/system.md" with { type: "text" };

export interface TuiSessionOptions {
  cwd?: string;
  extensionFactories?: ExtensionFactory[];
  onEvent?: AgentSessionEventListener;
  systemPromptOverride?: () => string;
  additionalThemePaths?: string[];
}

export async function createTuiSession(
  options: TuiSessionOptions = {},
): Promise<InteractiveMode> {
  const cwd = options.cwd ?? process.cwd();

  const services = await createAgentSessionServices({
    cwd,
    resourceLoaderOptions: {
      extensionFactories: options.extensionFactories,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      additionalThemePaths: options.additionalThemePaths,
      noContextFiles: true,
      systemPromptOverride: options.systemPromptOverride ?? (() => systemPrompt),
    },
  });

  // Patch Pi SDK compat for OpenCode DeepSeek V4 models
  // Pi SDK 0.80.6 defaults thinkingFormat: "openai" for opencode.ai URL,
  // but DeepSeek V4 requires "deepseek" format (thinking object, not reasoning_effort)
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
      };
    }
  }

  const sessionDir = join(cwd, "story", ".pi-session");
  const sessionManager = SessionManager.create(cwd, sessionDir);

const { session, extensionsResult, modelFallbackMessage } =
      await createAgentSessionFromServices({
        services,
        sessionManager,
        excludeTools: ["bash"],
        customTools: allKleptowriterTools,
      });

  const runtime = await createAgentSessionRuntime(
    async (opts) => {
      const s = await createAgentSessionServices({
        cwd: opts.cwd,
        agentDir: opts.agentDir,
        resourceLoaderOptions: {
          extensionFactories: options.extensionFactories,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          additionalThemePaths: options.additionalThemePaths,
          noContextFiles: true,
          systemPromptOverride: options.systemPromptOverride ?? (() => systemPrompt),
        },
      });

      // Patch Pi SDK compat for OpenCode DeepSeek V4 models (runtime session)
      const DEEPSEEK_V4_OPENCODE_MODELS = [
        "deepseek-v4-flash-free",
        "deepseek-v4-flash",
        "deepseek-v4-pro",
      ] as const;
      for (const modelId of DEEPSEEK_V4_OPENCODE_MODELS) {
        const model = s.modelRegistry.find("opencode", modelId);
        if (model) {
          model.compat = {
            ...model.compat,
            thinkingFormat: "deepseek" as const,
          };
        }
      }

      return createAgentSessionFromServices({
        services: s,
        sessionManager: opts.sessionManager,
        excludeTools: ["bash"],
        customTools: allKleptowriterTools,
      }).then((result) => ({
        ...result,
        services: s,
        diagnostics: s.diagnostics,
      }));
    },
    { cwd, agentDir: services.agentDir, sessionManager },
  );

  if (options.onEvent) {
    session.subscribe(options.onEvent);
  }

  const metadata = await loadMetadata(join(cwd, "story", "story-metadata.json"));
  setMetadata(metadata);

  return new InteractiveMode(runtime, {
    modelFallbackMessage,
  });
}
