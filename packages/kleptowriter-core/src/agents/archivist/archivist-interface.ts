import type { WikiDirectory } from "../../wiki/directory.js";
import type { WikiPage, WikiPageType, WikiIndexEntry as IndexEntry } from "../../wiki/types.js";
import type { RawInputFile } from "./scanner.js";

export type { IndexEntry };

export interface WikiUpdate {
  type: "create" | "update" | "delete";
  pageType: WikiPageType;
  pageName: string;
  content: string;
  reason: string;
}

export interface Archivist {
  processRawInput(paths: RawInputFile[]): Promise<WikiUpdate[]>;
  maintainWiki(updates: WikiUpdate[], wiki: WikiDirectory): Promise<void>;
  indexPages(wiki: WikiDirectory): Promise<IndexEntry[]>;
}

export type { WikiPage };
