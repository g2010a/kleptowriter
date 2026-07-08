import {
  createAgentSessionServices,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  SessionManager,
  InteractiveMode,
} from "@earendil-works/pi-coding-agent";
import type { AgentSessionEventListener, ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { allKleptowriterTools } from "./tools/registry.js";
import systemPrompt from "./prompt/system.md" with { type: "text" };

export interface TuiSessionOptions {
  cwd?: string;
  extensionFactories?: ExtensionFactory[];
  onEvent?: AgentSessionEventListener;
  systemPromptOverride?: () => string;
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
      noContextFiles: true,
      systemPromptOverride: options.systemPromptOverride ?? (() => systemPrompt),
    },
  });

  const sessionManager = SessionManager.inMemory();

  const { session, extensionsResult, modelFallbackMessage } =
    await createAgentSessionFromServices({
      services,
      sessionManager,
      noTools: "builtin",
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
          noContextFiles: true,
          systemPromptOverride: options.systemPromptOverride ?? (() => systemPrompt),
        },
      });

      return createAgentSessionFromServices({
        services: s,
        sessionManager: opts.sessionManager,
        noTools: "builtin",
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

  return new InteractiveMode(runtime, {
    modelFallbackMessage,
  });
}
