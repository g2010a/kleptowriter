import type { WikiLink } from "./types.js";

const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export class WikiLinkExtractor {
  static extractLinks(body: string): WikiLink[] {
    return Array.from(body.matchAll(WIKI_LINK_PATTERN), (match) => {
      const target = (match[1] ?? "").trim();
      const text = (match[2] ?? target).trim();

      return { text, target, isResolved: false };
    });
  }

  static resolveLink(link: string, knownPages: Map<string, string>): WikiLink {
    const [rawTarget, rawText] = splitLink(link);
    const target = rawTarget.trim();
    const text = (rawText ?? target).trim();

    return { text, target, isResolved: knownPages.has(target.toLowerCase()) };
  }

  static replaceLinks(body: string, resolver: (target: string) => string | null): string {
    return body.replaceAll(WIKI_LINK_PATTERN, (match, rawTarget: string, rawText: string | undefined) => {
      const target = rawTarget.trim();
      const text = (rawText ?? target).trim();
      const href = resolver(target);

      return href === null ? match : `[${escapeMarkdownLinkText(text)}](<${escapeMarkdownLinkDestination(href)}>)`;
    });
  }
}

function escapeMarkdownLinkText(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function escapeMarkdownLinkDestination(href: string): string {
  return href.replace(/[\s<>]/g, (character) => encodeURIComponent(character));
}

function splitLink(link: string): [string, string?] {
  const trimmed = link.trim();
  const inner = trimmed.startsWith("[[") && trimmed.endsWith("]]") ? trimmed.slice(2, -2) : trimmed;
  const separatorIndex = inner.indexOf("|");

  if (separatorIndex === -1) {
    return [inner];
  }

  return [inner.slice(0, separatorIndex), inner.slice(separatorIndex + 1)];
}
