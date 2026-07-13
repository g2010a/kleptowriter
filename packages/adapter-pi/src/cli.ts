#!/usr/bin/env bun
/**
 * Kleptowriter CLI — Pi SDK novel writing harness entry point.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... bun run start
 *
 * Without an API key, the CLI sets up the workspace and prints setup instructions,
 * then exits. No LLM session is started.
 */

import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { startNovelSession } from "./session.js";
import { createManifest } from "@kleptowriter/kleptowriter-core";

// ── Constants ──────────────────────────────────────────────────────────────

const WORKSPACE_ROOT = process.cwd();
const STORY_DIR = resolve(WORKSPACE_ROOT, "story");
const SCENES_DIR = resolve(STORY_DIR, "scenes");
const SESSION_DIR = resolve(STORY_DIR, ".pi-session");

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY);
}

// ── Event handler ───────────────────────────────────────────────────────────
// ponytail: only prints text-bearing events. Add richer TUI when needed.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function onSessionEvent(event: Record<string, unknown>): void {
  // Print text content from events that carry it
  if (!isRecord(event)) return;

  // Some Pi events carry a `text` field with assistant output
  if (event.type === "text" && typeof event.text === "string") {
    console.log(event.text);
    return;
  }

  // Agent messages carry content arrays with text blocks
  if (
    (event.type === "message" || event.type === "assistant_message") &&
    Array.isArray(event.content)
  ) {
    for (const part of event.content) {
      if (!isRecord(part)) continue;
      if (part.type === "text" && typeof part.text === "string") {
        process.stdout.write(part.text);
      }
    }
    return;
  }

  // Tool execution notifications (minimal)
  if (event.type === "tool_execution_start") {
    const toolName = event.toolName ?? event.name ?? "unknown";
    process.stdout.write(`\n[${toolName}]\n`);
    return;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── 1. Workspace setup ──────────────────────────────────────────────────
  ensureDir(SCENES_DIR);
  ensureDir(SESSION_DIR);

  const manifestPath = resolve(WORKSPACE_ROOT, ".kleptowriter.json");
  if (!existsSync(manifestPath)) {
    const projectName = WORKSPACE_ROOT.split("/").pop() || "kleptowriter-project";
    await createManifest(WORKSPACE_ROOT, projectName);
  }

  console.log("╔═══════════════════════════════════════════╗");
  console.log("║     Kleptowriter — Novel Writing Harness  ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("");
  console.log(`  Workspace : ${STORY_DIR}`);
  console.log(`  Scenes    : ${SCENES_DIR}`);
  console.log(`  Session   : ${SESSION_DIR}`);
  console.log("");

  // ── 2. API key check ────────────────────────────────────────────────────
  if (!hasApiKey()) {
    console.log("  No API key found. Set one of:");
    console.log("    export ANTHROPIC_API_KEY=sk-ant-...");
    console.log("    export OPENAI_API_KEY=sk-proj-...");
    console.log("");
    console.log("  Then re-run this command.");
    console.log("─────────────────────────────────────────────");
    process.exit(0);
  }

  // ── 3. Start session ────────────────────────────────────────────────────
  console.log("  Initializing Pi session...");
  console.log("");

  const { session, unsubscribe } = await startNovelSession({
    agentDir: SESSION_DIR,
    onEvent: onSessionEvent,
  });

  console.log("  Session ready. Type your novel prompts in the conversation.");
  console.log("  Press Ctrl+C to exit cleanly.");
  console.log("─────────────────────────────────────────────");
  console.log("");

  // ── 4. SIGINT handler ───────────────────────────────────────────────────
  let shuttingDown = false;

  process.on("SIGINT", async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log("");
    console.log("  Shutting down gracefully...");

    unsubscribe();
    session.dispose();

    console.log("  Session saved. Goodbye!");
    process.exit(0);
  });

  // ── 5. Wait for shutdown signal ─────────────────────────────────────────
  // The session is now live. The user interacts via Pi's event stream.
  // We stay alive until SIGINT.
  await new Promise<void>((_resolve) => {
    process.on("SIGINT", () => _resolve());
  });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`FATAL: ${msg}`);
  process.exit(1);
});
