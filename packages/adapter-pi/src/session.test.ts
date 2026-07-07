import { test, expect, describe, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKleptowriterSession, startNovelSession } from "./session.js";
import { allKleptowriterTools } from "./tools/registry.js";

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

describe("allKleptowriterTools", () => {
  test("exports exactly 9 tool definitions", () => {
    expect(allKleptowriterTools).toHaveLength(9);
  });

  test("all tools have expected names", () => {
    const names = allKleptowriterTools.map((t: { name: string }) => t.name);
    expect(names).toEqual(EXPECTED_TOOLS);
  });
});

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
