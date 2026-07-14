import { isValidProject, isEmptyDir, initProject, readProjectManifest } from "./project-detect.js";
import { createTuiSession } from "./session.js";
import { createKleptowriterExtension } from "./extension.js";
import { createWelcomeComponent } from "./welcome.js";
import { runStartupCheck } from "@kleptowriter/kleptowriter-core";
import { darkTheme, lightTheme } from "./themes.js";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Pre-TUI prompts ─────────────────────────────────────────────────────────

function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(`${question} `);
    let data = "";
    const onChunk = (chunk: Buffer) => {
      data += chunk.toString();
      if (data.includes("\n")) {
        process.stdin.removeListener("data", onChunk);
        process.stdin.pause();
        resolve(data.trim());
      }
    };
    process.stdin.setEncoding("utf-8");
    process.stdin.resume();
    process.stdin.on("data", onChunk);
  });
}

// ── CWD-based project detection ──────────────────────────────────────────────

export async function detectOrInitProject(): Promise<{ name: string; path: string }> {
  const cwd = process.cwd();
  const valid = await isValidProject(cwd);

  if (valid) {
    const manifest = await readProjectManifest(cwd);
    return { name: manifest.name, path: cwd };
  }

  const empty = await isEmptyDir(cwd);

  if (empty) {
    console.log(`\nThis directory is empty. Initialize '${cwd}' as a Kleptowriter project? (y/N)`);
    const answer = await promptLine("");

    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      const dirName = cwd.split("/").filter(Boolean).pop() || "my-project";
      const name = await promptLine(`Project name [${dirName}]:`);
      const projectName = name.trim() || dirName;
      await initProject(cwd, projectName);
      console.log(`\nProject '${projectName}' initialized.\n`);
      return { name: projectName, path: cwd };
    }

    console.log("Ok, exiting.");
    process.exit(0);
  }

  console.log(`\nDirectory '${cwd}' already contains files and is not a Kleptowriter project.`);
  console.log("Please run kleptowriter in an empty directory or inside an existing story directory.");
  process.exit(1);
}

// ── Theme directory setup for compiled binary ────────────────────────────────

let _themeDir: string | null = null;

export function ensureThemeDir(): string[] {
  const dir = mkdtempSync(join(tmpdir(), "kleptowriter-themes-"));
  const themeDir = join(dir, "theme");
  mkdirSync(themeDir, { recursive: true });

  const darkPath = join(themeDir, "dark.json");
  const lightPath = join(themeDir, "light.json");
  writeFileSync(darkPath, JSON.stringify(darkTheme, null, 2), "utf-8");
  writeFileSync(lightPath, JSON.stringify(lightTheme, null, 2), "utf-8");

  _themeDir = dir;
  return [darkPath, lightPath];
}

export function cleanupThemeDir(): void {
  if (_themeDir) {
    rmSync(_themeDir, { recursive: true, force: true });
    _themeDir = null;
  }
}

function registerCleanupHandlers(): void {
  const cleanup = () => cleanupThemeDir();
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function main() {
  // Suppress Pi SDK's automatic version check to avoid update warnings
  process.env.PI_SKIP_VERSION_CHECK = "1";

  const themePaths = ensureThemeDir();
  registerCleanupHandlers();

  const project = await detectOrInitProject();
  if (!project) return;

  // Run startup version check before TUI starts so output is visible
  const startupResult = await runStartupCheck(project.path).catch(() => null);
  if (startupResult?.needsMigration) {
    console.warn(`\n[kleptowriter] Project upgrade needed:`);
    for (const msg of startupResult.pendingMigrations) {
      console.warn(`  ${msg}`);
    }
    console.warn(`  Run 'kleptowriter version:upgrade' to migrate.\n`);
  }

  const welcome = createWelcomeComponent();
  const session = await createTuiSession({
    cwd: project.path,
    extensionFactories: [createKleptowriterExtension(welcome)],
    additionalThemePaths: themePaths,
  });

  process.on("SIGINT", () => {
    cleanupThemeDir();
    session.stop();
    process.exit(0);
  });

  await session.run();
}

if (import.meta.main) {
  main().catch(console.error);
}
