import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { parseWikiPage } from "./parser.js";
import { WikiLinkExtractor } from "./link-extractor.js";
import type { WikiPage, WikiLink, WikiPageType, WikiIndexEntry } from "./types.js";

const SKIPPED_MARKDOWN_FILES = new Set(["index.md", "log.md"]);

export class WikiDirectory {
  private pagePaths = new WeakMap<WikiPage, string>();

  async scan(rootPath: string): Promise<WikiPage[]> {
    const pages: WikiPage[] = [];

    for (const path of collectMarkdownPages(rootPath)) {
      const result = await parseWikiPage(path);
      if (!result.ok) {
        console.error(`Failed to scan wiki page ${path}: ${result.error}`);
        continue;
      }

      this.pagePaths.set(result.data, relative(rootPath, path));
      pages.push(result.data);
    }

    return pages;
  }

  buildIndex(pages: WikiPage[]): WikiIndexEntry[] {
    return pages
      .map((page) => ({
        type: page.type,
        name: page.name,
        path: this.pagePaths.get(page) ?? `${slugify(page.name)}.md`,
        tags: page.tags,
        summary: summarizePage(page),
      }))
      .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
  }

  async writeIndex(path: string, entries: WikiIndexEntry[]): Promise<void> {
    const lines = [
      "# Wiki Index",
      "",
      ...entries.map((entry) => {
        const tags = entry.tags.length > 0 ? entry.tags.join(", ") : "none";
        return `- [${entry.type}] **${entry.name}** — ${entry.summary} (tags: ${tags})`;
      }),
      "",
    ];

    await Bun.write(path, lines.join("\n"));
  }

  async appendLog(path: string, entry: string): Promise<void> {
    const existing = await readOptionalText(path);
    const line = `${new Date().toISOString()} ${entry.trim()}`;
    await Bun.write(path, existing === "" ? `${line}\n` : `${line}\n${existing}`);
  }

  resolveWikiLink(link: string, pages: WikiPage[]): WikiLink {
    const knownPages = new Map<string, string>();
    for (const page of pages) {
      knownPages.set(page.name.toLowerCase(), page.name);
      for (const alias of page.aliases) {
        knownPages.set(alias.toLowerCase(), page.name);
      }
    }

    const resolved = WikiLinkExtractor.resolveLink(link, knownPages);
    if (!resolved.isResolved) {
      return resolved;
    }

    return { ...resolved, target: knownPages.get(resolved.target.toLowerCase()) ?? resolved.target };
  }
}

function collectMarkdownPages(rootPath: string): string[] {
  const paths: string[] = [];

  try {
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      const path = join(rootPath, entry.name);

      if (entry.isDirectory()) {
        paths.push(...collectMarkdownPages(path));
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".md") && !SKIPPED_MARKDOWN_FILES.has(entry.name.toLowerCase())) {
        paths.push(path);
      }
    }
  } catch (error) {
    console.error(`Failed to read wiki directory ${rootPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return paths;
}

function summarizePage(page: WikiPage): string {
  const frontmatterSummary = page.frontmatter.summary;
  if (typeof frontmatterSummary === "string" && frontmatterSummary.trim() !== "") {
    return cleanSummary(frontmatterSummary);
  }

  return cleanSummary(page.body.split("\n").find((line) => line.trim() !== "") ?? "No summary");
}

function cleanSummary(value: string): string {
  return value.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim() || "No summary";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
}

async function readOptionalText(path: string): Promise<string> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.text() : "";
}
