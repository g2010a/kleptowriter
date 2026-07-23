import { isValidProject, isEmptyDir, initProject, readProjectManifest } from "./project-detect.js";
import { createTuiSession as createTuiSessionReal } from "./session.js";
import { createKleptowriterExtension as createKleptowriterExtensionReal } from "./extension.js";
import { createWelcomeComponent as createWelcomeComponentReal } from "./welcome.js";
import type { WelcomeComponent } from "./welcome.js";
import { runStartupCheck } from "@kleptowriter/kleptowriter-core";
import type { StartupCheckResult } from "@kleptowriter/kleptowriter-core";
import type { ExtensionFactory } from "@earendil-works/pi-coding-agent";
import type { InteractiveMode } from "@earendil-works/pi-coding-agent";
import { darkTheme, lightTheme } from "./themes.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

export interface MainOptions {
  createTuiSession?: (options?: import("./session.js").TuiSessionOptions) => Promise<InteractiveMode>;
  createKleptowriterExtension?: (welcome?: WelcomeComponent, startupResult?: StartupCheckResult | null) => ExtensionFactory;
  createWelcomeComponent?: (options?: Record<string, unknown>) => WelcomeComponent;
}

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

/**
 * Detect if running as a compiled Bun binary.
 * Pi SDK uses the same heuristic in its config.js.
 */
const isBunBinary =
  import.meta.url.includes("$bunfs") ||
  import.meta.url.includes("~BUN") ||
  import.meta.url.includes("%7EBUN");

let _themeDir: string | null = null;

export function ensureThemeDir(): string[] {
  if (isBunBinary) {
    // Write themes next to the compiled binary so Pi SDK's getBuiltinThemes()
    // finds them via getThemesDir() → join(dirname(execPath), "theme").
    const themeDir = join(dirname(process.execPath), "theme");
    try {
      mkdirSync(themeDir, { recursive: true });
      const darkPath = join(themeDir, "dark.json");
      const lightPath = join(themeDir, "light.json");
      writeFileSync(darkPath, JSON.stringify(darkTheme, null, 2), "utf-8");
      writeFileSync(lightPath, JSON.stringify(lightTheme, null, 2), "utf-8");
      return [darkPath, lightPath];
    } catch {
      // Not writable — fall through to temp dir
    }
  }

  // Fallback (dev mode / edge cases): temp dir for additionalThemePaths mechanism
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

export async function main(opts?: MainOptions) {
  // Suppress Pi SDK's automatic version check to avoid update warnings
  process.env.PI_SKIP_VERSION_CHECK = "1";

  const createSession = opts?.createTuiSession ?? createTuiSessionReal;
  const createExt = opts?.createKleptowriterExtension ?? createKleptowriterExtensionReal;
  const createWelcome = opts?.createWelcomeComponent ?? createWelcomeComponentReal;

  const themePaths = ensureThemeDir();
  registerCleanupHandlers();

  const project = await detectOrInitProject();
  if (!project) return;

  // Run startup version check before TUI starts so output is visible
  const startupResult = await runStartupCheck(project.path).catch(() => null);

  const welcome = createWelcome();
  const session = await createSession({
    cwd: project.path,
    extensionFactories: [createExt(welcome, startupResult)],
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
