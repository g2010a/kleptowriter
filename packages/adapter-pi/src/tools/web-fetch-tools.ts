/**
 * Web fetch tool — fetches a URL and extracts readable article content.
 *
 * Uses linkedom for DOM parsing, @mozilla/readability for content extraction,
 * and turndown for HTML-to-Markdown conversion. No API key required.
 *
 * ponytail: linkedom is a lightweight DOM implementation. If it fails on
 * complex pages, consider jsdom (heavier) as a fallback.
 */

import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { DOMParser } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

interface WebFetchDetails {
  url?: string;
  title?: string;
  content?: string;
  error?: string;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

export const webFetchTool = defineTool({
  name: "web_fetch",
  label: "Web Fetch",
  description:
    "Fetches a URL and extracts the main article content as Markdown. " +
    "Use this to read articles, documentation, or any web page content. " +
    "Returns the page title and cleaned Markdown content.",
  parameters: Type.Object({
    url: Type.String({ description: "URL to fetch and extract content from" }),
    maxLength: Type.Optional(
      Type.Integer({
        description: "Maximum content length in characters (default: 50000)",
        minimum: 1000,
        maximum: 200000,
      }),
    ),
  }),
  execute: async (_toolCallId, params: { url: string; maxLength?: number }) => {
    const maxLength = params.maxLength ?? 50000;

    let html: string;
    let finalUrl: string;
    try {
      const res = await fetch(params.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Kleptowriter/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        return {
          content: textContent(`Failed to fetch ${params.url}: ${res.status} ${res.statusText}`),
          details: { error: `HTTP ${res.status}: ${res.statusText}`, url: params.url } as WebFetchDetails,
        };
      }
      html = await res.text();
      finalUrl = res.url;
    } catch (err) {
      return {
        content: textContent(`Web fetch failed: ${err}`),
        details: { error: String(err), url: params.url } as WebFetchDetails,
      };
    }

let title: string;
    let markdown: string;
    try {
      const document = new DOMParser().parseFromString(html, "text/html", { url: finalUrl });

      const reader = new Readability(document as unknown as Document);
      const article = reader.parse();

      if (!article) {
        return {
          content: textContent(`Could not extract readable content from ${finalUrl}`),
          details: { error: "Readability extraction returned null", url: finalUrl, title: undefined, content: undefined } as WebFetchDetails,
        };
      }

      title = article.title ?? "";
      markdown = turndown.turndown(article.content);
    } catch (err) {
      return {
        content: textContent(`Content extraction failed: ${err}`),
        details: { error: String(err), url: finalUrl, title: undefined, content: undefined } as WebFetchDetails,
      };
    }

    if (markdown.length > maxLength) {
      markdown = markdown.slice(0, maxLength) + "\n\n[...truncated]";
    }

    return {
      content: textContent(JSON.stringify({ url: finalUrl, title, content: markdown }, null, 2)),
      details: { url: finalUrl, title, content: markdown, error: undefined } as WebFetchDetails,
    };
  },
});