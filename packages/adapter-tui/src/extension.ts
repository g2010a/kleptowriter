import type { ExtensionFactory } from "@earendil-works/pi-coding-agent";
import type { WelcomeComponent } from "./welcome.js";
import type { StartupCheckResult } from "@kleptowriter/kleptowriter-core";
import {
  VersionRegistry,
  setupMigrations,
  loadAndMigrate,
  runStartupCheck,
  MANIFEST_SCHEMA_VERSION,
  STORY_SCHEMA_VERSION,
} from "@kleptowriter/kleptowriter-core";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

interface CommandDef {
  name: string;
  description: string;
  guidance: string;
}

const commands: CommandDef[] = [
  {
    name: "/interview",
    description: "Start the interview phase to establish premise, genre, characters, and setting",
    guidance:
      "The user wants to start the interview phase. Ask them about their story's premise, genre, target audience, main characters, and setting. Work through each topic systematically to build a solid foundation before writing.",
  },
  {
    name: "/ingest",
    description: "Begin material ingestion — feed source material into the project story-metadata",
    guidance:
      "The user wants to ingest source material. Ask them to provide text, files, or notes to add to the project story-metadata. Summarize what they provide and confirm what was captured before moving on.",
  },
  {
    name: "/write",
    description: "Enter scene writing mode to draft the next scene",
    guidance:
      "The user wants to write a scene. Review the current project state — metadata, scenes already written, and any outline — then draft the next scene. Follow established style, tone, and character voices.",
  },
  {
    name: "/metadata",
    description: "Query the project story-metadata and present its current state",
    guidance:
      "The user wants to see the current state of the project story-metadata. Read the metadata file and present a summary of what's stored — premise, characters, setting, genre, tone, and any other tracked elements.",
  },
  {
    name: "/scenes",
    description: "List all written scenes with their word counts",
    guidance:
      "The user wants an overview of all scenes written so far. List each scene with its title, word count, and a one-line summary. Show total word count across all scenes.",
  },
  {
    name: "/project",
    description: "Show current project info (name, path, word count)",
    guidance:
      "The user wants to see the current project info. Display the project name, directory, word count totals, and scene count. Project switching is done by exiting and running kleptowriter from a different directory.",
  },
];

// ponytail: command list is static data, no need for a registry
export function createKleptowriterExtension(
  welcome?: WelcomeComponent,
  startupResult?: StartupCheckResult | null,
): ExtensionFactory {
  return (pi) => {
    for (const cmd of commands) {
      pi.registerCommand(cmd.name, {
        description: cmd.description,
        handler: async (args, ctx) => {
          if (!ctx.model) {
            ctx.ui.notify(
              `Run /login to configure an AI provider, then use ${cmd.name}`,
              "warning",
            );
            return;
          }
          const message =
            cmd.guidance + (args ? `\n\nUser context: ${args}` : "");
          pi.sendUserMessage(message);
        },
      });
    }

    if (welcome) {
      let dismissed = false;

      pi.on("session_start", async (_event, ctx) => {
        if (startupResult?.needsMigration && ctx.mode === "tui" && ctx.hasUI) {
          const lines = startupResult.pendingMigrations
            .map((m: string) => `  • ${m}`)
            .join("\n");
          ctx.ui.notify(
            `Project upgrade needed:\n${lines}\nType /version-upgrade to migrate.`,
            "warning",
          );
        }

        if (ctx.mode === "tui" && ctx.hasUI) {
          ctx.ui.setHeader((_tui, _theme) => ({
            render: (width: number) => welcome.render(width),
            handleInput: (data: string) => {
              welcome.handleInput(data);
            },
            invalidate: () => {},
            dispose: () => {},
          }));
        }
      });

      pi.on("input", async (event, ctx) => {
        if (!dismissed && event.source === "interactive") {
          dismissed = true;
          welcome.handleInput(event.text);
          if (ctx.mode === "tui" && ctx.hasUI) {
            ctx.ui.setHeader(undefined);
          }
        }
      });
    }

    // ponytail: /version-upgrade is a standalone utility — no AI provider needed
    pi.registerCommand("/version-upgrade", {
      description: "Run schema migrations to upgrade project data format",
      handler: async (_args, ctx) => {
        const projectDir = process.cwd();

        const check = await runStartupCheck(projectDir);
        if (!check.needsMigration) {
          ctx.ui.notify("Project is already up to date.", "info");
          return;
        }

        const registry = new VersionRegistry();
        setupMigrations(registry);

        const manifestPath = join(projectDir, ".kleptowriter.json");
        const storyPath = join(projectDir, "story", "story-metadata.json");

        let migrated = 0;

        try {
          const manifestResult = await loadAndMigrate<Record<string, unknown>>(
            manifestPath, registry, MANIFEST_SCHEMA_VERSION,
          );
          if (manifestResult.migrated) {
            await writeFile(manifestPath, JSON.stringify(manifestResult.data, null, 2) + "\n");
            migrated++;
          }

          const storyResult = await loadAndMigrate<Record<string, unknown>>(
            storyPath, registry, STORY_SCHEMA_VERSION,
          );
          if (storyResult.migrated) {
            await writeFile(storyPath, JSON.stringify(storyResult.data, null, 2) + "\n");
            migrated++;
          }

          ctx.ui.notify(
            `${migrated} file(s) migrated. Restart session for changes to take full effect.`,
            "info",
          );
        } catch (err) {
          ctx.ui.notify(`Upgrade failed: ${(err as Error).message}`, "error");
        }
      },
    });
  };
}
