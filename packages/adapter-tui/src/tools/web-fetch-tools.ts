/**
 * web_fetch Pi tool — fetches a URL, extracts article content via
 * @mozilla/readability, and converts to Markdown via turndown + linkedom.
 *
 * Pipeline: fetch(url) → linkedom.parseHTML → Readability.parse →
 * TurndownService.turndown → markdown string.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

interface WebFetchDetails {
  success: boolean;
  url?: string;
  title?: string;
  content?: string;
  error?: string;
}

export const webFetchTool = defineTool({
  name: "web_fetch",
  label: "Web Fetch",
  description:
    "Fetches a URL, extracts the main article content using Firefox Reader View, " +
    "and converts it to Markdown. Returns the page title and markdown content.",
  parameters: Type.Object({
    url: Type.String({ description: "URL to fetch and convert to markdown" }),
  }),
  execute: async (_toolCallId, params: { url: string }) => {
    const { url } = params;

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Kleptowriter/1.0)",
        },
      });
      if (!res.ok) {
        return {
          content: textContent(`Fetch failed: HTTP ${res.status}`),
          details: { success: false, error: `HTTP ${res.status} ${res.statusText}` } as WebFetchDetails,
        };
      }
      html = await res.text();
    } catch (err) {
      return {
        content: textContent(`Web fetch failed: ${err}`),
        details: { success: false, error: String(err) } as WebFetchDetails,
      };
    }

    try {
      const { document } = parseHTML(html);
      const reader = new Readability(document);
      const article = reader.parse();
      const turndownService = new TurndownService();

      if (article && article.content) {
        const markdown = turndownService.turndown(article.content);
        return {
          content: textContent(markdown),
          details: { success: true, url, title: article.title ?? url, content: markdown } as WebFetchDetails,
        };
      }

      // ponytail: full-HTML fallback when Readability returns nothing
      const markdown = turndownService.turndown(html);
      return {
        content: textContent(markdown),
        details: { success: true, url, title: url, content: markdown } as WebFetchDetails,
      };
    } catch (err) {
      return {
        content: textContent(`Article extraction failed: ${err}`),
        details: { success: false, error: `Article extraction failed: ${err}` } as WebFetchDetails,
      };
    }
  },
});
