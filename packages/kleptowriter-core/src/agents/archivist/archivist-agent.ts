import type { RawInputFile } from "./scanner.js";
import type { LiteraryAgent } from "../types.js";
import type { WikiDirectory } from "../../wiki/directory.js";
import type { PopulationReport } from "../../wiki/population.js";
import type { WikiIndexEntry } from "../../wiki/types.js";
import type { WikiUpdate } from "./archivist-interface.js";

export interface ArchivistAgent extends LiteraryAgent {
  processRawInput(paths: RawInputFile[]): Promise<WikiUpdate[]>;
  maintainWiki(updates: WikiUpdate[], wiki: WikiDirectory): Promise<void>;
  indexPages(wiki: WikiDirectory): Promise<WikiIndexEntry[]>;
  scanAndUpdate(rawInputPath: string, wikiRoot: string): Promise<PopulationReport>;
}
