import type { CharacterState, ItemState, LocationState, PlotThread } from "../data-model/bible/interfaces.js";
import { InMemoryStoryBible } from "../data-model/bible/cache.js";
import { WikiLinkExtractor } from "./link-extractor.js";
import { WikiPageType, type WikiLink, type WikiPage } from "./types.js";

export interface PopulationReport {
  entitiesCreated: number;
  entitiesUpdated: number;
  warnings: string[];
  unresolvedLinks: WikiLink[];
  pageTypeCounts: Record<WikiPageType, number>;
  timestamp: Date;
}

export class WikiToBiblePopulation {
  populate(wikiPages: WikiPage[], bible: InMemoryStoryBible): PopulationReport {
    const report: PopulationReport = {
      entitiesCreated: 0,
      entitiesUpdated: 0,
      warnings: [],
      unresolvedLinks: [],
      pageTypeCounts: emptyPageTypeCounts(),
      timestamp: new Date(),
    };
    const knownPages = buildKnownPages(wikiPages);

    for (const page of wikiPages) {
      const pageName = normalizeString(page.name);
      const pageLabel = pageName || "<unnamed>";
      const type = page.type;

      recordUnresolvedLinks(page, knownPages, report);

      if (!pageName) {
        report.warnings.push(`Missing required field "name" on ${String(type)} page`);
        continue;
      }

      if (!isWikiPageType(type)) {
        report.warnings.push(`Unknown wiki page type "${String(type)}" on page "${pageLabel}"`);
        continue;
      }

      report.pageTypeCounts[type] += 1;

      switch (type) {
        case WikiPageType.Character: {
          const character = this.extractCharacter(page);
          const id = character.id ?? pageName;
          const exists = bible.getCharacter(id) !== undefined;
          bible.applyStateUpdate({ characters: new Map([[id, character]]) });
          countPersistence(report, exists);
          break;
        }
        case WikiPageType.Location: {
          const location = this.extractLocation(page);
          const id = location.id ?? pageName;
          const exists = bible.getLocation(id) !== undefined;
          bible.applyStateUpdate({ locations: new Map([[id, location]]) });
          countPersistence(report, exists);
          break;
        }
        case WikiPageType.Plot: {
          const plotThread = this.extractPlotThread(page);
          const id = plotThread.id ?? pageName;
          const exists = bible.getPlotThread(id) !== undefined;
          bible.applyStateUpdate({ plotThreads: new Map([[id, plotThread]]) });
          countPersistence(report, exists);
          break;
        }
        case WikiPageType.Concept: {
          const item = this.extractItem(page);
          const id = item.id ?? pageName;
          const exists = bible.getItem(id) !== undefined;
          bible.applyStateUpdate({ items: new Map([[id, item]]) });
          countPersistence(report, exists);
          break;
        }
        case WikiPageType.Research:
        case WikiPageType.Scene:
          break;
      }
    }

    return report;
  }

  extractCharacter(page: WikiPage): Partial<CharacterState> {
    const body = normalizeString(page.body);

    return {
      id: normalizeString(page.name),
      name: normalizeString(page.name),
      aliases: normalizeStringArray(page.aliases),
      tags: normalizeStringArray(page.tags),
      traits: body ? { description: body } : {},
      relationships: new Map(),
      knowledge: new Set(),
      arcBeatIds: [],
    };
  }

  extractLocation(page: WikiPage): Partial<LocationState> {
    return {
      id: normalizeString(page.name),
      name: normalizeString(page.name),
      aliases: normalizeStringArray(page.aliases),
      tags: normalizeStringArray(page.tags),
      description: normalizeString(page.body),
      relatedLocations: normalizeStringArray(page.relatedPages),
    };
  }

  extractPlotThread(page: WikiPage): Partial<PlotThread> {
    return {
      id: normalizeString(page.name),
      name: normalizeString(page.name),
      description: normalizeString(page.body),
      status: parsePlotStatus(page.frontmatter.status),
      relatedSceneIds: normalizeStringArray(page.relatedPages),
    };
  }

  extractItem(page: WikiPage): Partial<ItemState> {
    return {
      id: normalizeString(page.name),
      name: normalizeString(page.name),
      aliases: normalizeStringArray(page.aliases),
      tags: normalizeStringArray(page.tags),
      description: normalizeString(page.body),
    };
  }
}

function emptyPageTypeCounts(): Record<WikiPageType, number> {
  return {
    [WikiPageType.Character]: 0,
    [WikiPageType.Location]: 0,
    [WikiPageType.Concept]: 0,
    [WikiPageType.Plot]: 0,
    [WikiPageType.Research]: 0,
    [WikiPageType.Scene]: 0,
  };
}

function buildKnownPages(wikiPages: WikiPage[]): Map<string, string> {
  const knownPages = new Map<string, string>();

  for (const page of wikiPages) {
    for (const name of [page.name, ...normalizeStringArray(page.aliases)]) {
      const normalized = normalizeString(name);
      if (normalized) knownPages.set(normalized.toLocaleLowerCase(), normalized);
    }
  }

  return knownPages;
}

function recordUnresolvedLinks(page: WikiPage, knownPages: Map<string, string>, report: PopulationReport): void {
  for (const link of WikiLinkExtractor.extractLinks(normalizeString(page.body))) {
    const resolved = WikiLinkExtractor.resolveLink(link.target, knownPages);
    if (resolved.isResolved) continue;

    report.unresolvedLinks.push(resolved);
    report.warnings.push(`Unresolved wiki link "${resolved.target}" on page "${normalizeString(page.name) || "<unnamed>"}"`);
  }
}

function isWikiPageType(type: unknown): type is WikiPageType {
  return typeof type === "string" && Object.values(WikiPageType).includes(type as WikiPageType);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalizeString).filter(Boolean) : [];
}

function parsePlotStatus(value: unknown): PlotThread["status"] {
  return value === "introduced" || value === "developed" || value === "resolved" || value === "dropped"
    ? value
    : "introduced";
}

function countPersistence(report: PopulationReport, existed: boolean): void {
  if (existed) {
    report.entitiesUpdated += 1;
  } else {
    report.entitiesCreated += 1;
  }
}
