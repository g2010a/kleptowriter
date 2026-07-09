/**
 * Web search tool — DuckDuckGo HTML backend, no API key required.
 *
 * Uses built-in `fetch` to scrape DDG HTML results. No dependencies.
 *
 * ponytail: regex HTML parsing. Switch to a proper parser if DDG changes
 * their HTML structure significantly.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

interface WebSearchDetails {
  query?: string;
  results: SearchResult[];
  count?: number;
  error?: string;
}

export const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  description:
    "Searches the web using DuckDuckGo. Returns up to maxResults titles, " +
    "URLs, and snippets. Use this to research topics, verify facts, or " +
    "find information online.",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
    maxResults: Type.Optional(
      Type.Integer({
        description: "Max results to return (default: 8)",
        minimum: 1,
        maximum: 20,
      }),
    ),
  }),
  execute: async (_toolCallId, params: { query: string; maxResults?: number }) => {
    const maxResults = params.maxResults ?? 8;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`;

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Kleptowriter/1.0)",
        },
      });
      html = await res.text();
    } catch (err) {
      return {
        content: textContent(`Web search failed: ${err}`),
        details: { error: String(err), results: [] as SearchResult[], query: undefined as string | undefined, count: undefined as number | undefined } as WebSearchDetails,
      };
    }

    // Parse HTML for .result__a (link) and .result__snippet (description)
    // DuckDuckGo HTML structure: <a class="result__a" href="...">title</a>
    // and <a class="result__snippet">snippet</a> (or nearby)
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    for (;;) {
      const r = linkRegex.exec(html);
      if (!r || links.length >= maxResults) break;
      const href = r[1]!.replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "");
      const title = r[2]!.replace(/<[^>]+>/g, "").trim();
      if (title) {
        links.push({ url: decodeURIComponent(href), title });
      }
    }

    for (;;) {
      const r = snippetRegex.exec(html);
      if (!r || snippets.length >= maxResults) break;
      const snippet = r[1]!.replace(/<[^>]+>/g, "").trim();
      if (snippet) snippets.push(snippet);
    }

    const results: SearchResult[] = links.slice(0, maxResults).map((link, i) => ({
      title: link.title,
      url: link.url,
      snippet: snippets[i] ?? "",
    }));

    return {
      content: textContent(JSON.stringify({ query: params.query, results }, null, 2)),
      details: { query: params.query, results, count: results.length, error: undefined } as WebSearchDetails,
    };
  },
});