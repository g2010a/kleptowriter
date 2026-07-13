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
import { runStartupCheck } from "@kleptowriter/kleptowriter-core";
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

  // Non-blocking startup version check
  runStartupCheck(cwd).then((result) => {
    if (result.needsMigration) {
      console.warn(`[kleptowriter] Project upgrade needed: ${result.pendingMigrations.join(", ")}`);
    }
  }).catch((err) => {
    console.warn(`[kleptowriter] Startup version check failed: ${(err as Error).message}`);
  });

  return new InteractiveMode(runtime, {
    modelFallbackMessage,
  });
}
