import { expect, test } from "bun:test";
import { webFetchTool } from "./web-fetch-tools.js";

// ── Happy path: fetch a known URL ──────────────────────────────────────────

test("web_fetch extracts article from example.com", async () => {
  const result = await webFetchTool.execute(
    "call-1",
    { url: "http://example.com" },
    undefined,
    undefined,
    {} as any,
  );
  const details = result.details as unknown as Record<string, unknown>;

  expect(details.success).toBe(true);
  expect(typeof details.url).toBe("string");
  expect(details.url).toBe("http://example.com");
  expect(typeof details.title).toBe("string");
  expect(typeof details.content).toBe("string");
  expect((details.content as string).length).toBeGreaterThan(0);
  // Should contain some markdown-ish content from example.com
  expect(details.content as string).toMatch(/example|domain|markdown|illustrati/i);
}, 15_000);

// ── Error path: unreachable URL ────────────────────────────────────────────

test("web_fetch returns error for unreachable URL", async () => {
  const result = await webFetchTool.execute(
    "call-2",
    { url: "http://0.0.0.0:1" },
    undefined,
    undefined,
    {} as any,
  );
  const details = result.details as unknown as Record<string, unknown>;

  expect(details.success).toBe(false);
  expect(typeof details.error).toBe("string");
  expect((details.error as string).length).toBeGreaterThan(0);
}, 10_000);
