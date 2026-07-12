/**
 * Tests for web-fetch-tools.ts
 */

import { describe, it, expect, beforeEach, vi, afterAll } from "bun:test";
import { webFetchTool } from "./web-fetch-tools.js";

describe("webFetchTool", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch as any;
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("should fetch and extract content successfully (happy path)", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article</h1>
            <p>This is the main content of the article.</p>
            <p>It has multiple paragraphs.</p>
          </article>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      url: "https://example.com/article",
      text: async () => html,
    } as Response);

    const result = await webFetchTool.execute("test-call-id", { url: "https://example.com/article" }, undefined, undefined, {} as any);

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    const firstContent = result.content[0]!;
    expect(firstContent.type).toBe("text");
    const content = JSON.parse((firstContent as { type: "text"; text: string }).text);
    expect(content.url).toBe("https://example.com/article");
    expect(content.title).toBe("Test Article");
    expect(content.content).toContain("main content");
    expect(content.content).toContain("multiple paragraphs");
    expect(result.details).toBeDefined();
    expect(result.details.url).toBe("https://example.com/article");
    expect(result.details.title).toBe("Test Article");
    expect(result.details.error).toBeUndefined();
  });

  it("should handle HTTP error responses (error path)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      url: "https://example.com/notfound",
      text: async () => "Not Found",
    } as Response);

    const result = await webFetchTool.execute("test-call-id", { url: "https://example.com/notfound" }, undefined, undefined, {} as any);

    expect(result.content).toBeDefined();
    const firstContent = result.content[0]!;
    expect((firstContent as { type: "text"; text: string }).text).toContain("Failed to fetch");
    expect((firstContent as { type: "text"; text: string }).text).toContain("404");
    expect(result.details.error).toContain("HTTP 404");
  });

  it("should handle network errors (error path)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await webFetchTool.execute("test-call-id", { url: "https://example.com/article" }, undefined, undefined, {} as any);

    expect(result.content).toBeDefined();
    const firstContent = result.content[0]!;
    expect((firstContent as { type: "text"; text: string }).text).toContain("Web fetch failed");
    expect((firstContent as { type: "text"; text: string }).text).toContain("Network error");
    expect(result.details.error).toContain("Network error");
  });

  it("should handle unreadable content (error path)", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Empty Page</title></head>
        <body><script>console.log("no article")</script></body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      url: "https://example.com/empty",
      text: async () => html,
    } as Response);

    const result = await webFetchTool.execute("test-call-id", { url: "https://example.com/empty" }, undefined, undefined, {} as any);

    expect(result.content).toBeDefined();
    const firstContent = result.content[0]!;
    // Readability might still extract something, so check for either error or empty content
    const text = (firstContent as { type: "text"; text: string }).text;
    // Readability returns null for empty pages → plain text error message
    const isError = text.includes("Could not extract readable content") || text.includes("extraction failed");
    // If Readability returns content, it's JSON — check if content is empty
    let isEmpty = false;
    try {
      const parsed = JSON.parse(text);
      isEmpty = parsed.content?.trim() === "";
    } catch { /* not JSON, already handled by isError */ }
    expect(isError || isEmpty).toBe(true);
  });

  it("should respect maxLength parameter", async () => {
    const longContent = "A".repeat(10000);
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Long Article</title></head>
        <body>
          <article>
            <h1>Long Article</h1>
            <p>${longContent}</p>
          </article>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      url: "https://example.com/long",
      text: async () => html,
    } as Response);

    const result = await webFetchTool.execute("test-call-id", { url: "https://example.com/long", maxLength: 1000 }, undefined, undefined, {} as any);

    expect(result.content).toBeDefined();
    const firstContent = result.content[0]!;
    const content = JSON.parse((firstContent as { type: "text"; text: string }).text);
    expect(content.content.length).toBeLessThanOrEqual(1000 + 20); // truncated + "[...truncated]"
    expect(content.content).toContain("[...truncated]");
  });
});