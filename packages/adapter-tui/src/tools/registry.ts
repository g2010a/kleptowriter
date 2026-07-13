/**
 * Tool registry — aggregates all 11 Kleptowriter custom tool definitions.
 *
 * Re-exports real implementations from their respective modules.
 * Used by session.ts to pass the full tool set to createAgentSession().
 */

import { writeSceneTool, readSceneTool, listScenesTool } from "./scene-tools.js";
import { queryMetadataTool, updateMetadataTool } from "./metadata-tools.js";
import { evaluateProseTool } from "./eval-tools.js";
import { loadContextTool } from "./context-tools.js";
import { suggestNextBeatTool } from "./markov-tools.js";
import { deduceChaptersTool } from "./chapter-tools.js";
import { webSearchTool } from "./web-search-tools.js";
import { webFetchTool } from "./web-fetch-tools.js";
import { listNarrativeTemplatesTool } from "./narrative-tools.js";
import { getProjectVersionTool } from "./project-version-tools.js";

export {
  writeSceneTool,
  readSceneTool,
  listScenesTool,
  queryMetadataTool,
  updateMetadataTool,
  evaluateProseTool,
  loadContextTool,
  suggestNextBeatTool,
  deduceChaptersTool,
  listNarrativeTemplatesTool,
  getProjectVersionTool,
  webSearchTool,
  webFetchTool,
};

export { setMetadata, getMetadata, getMetadataPath } from "./metadata-tools.js";
export { getSceneStore } from "./scene-tools.js";

/**
 * All 13 Kleptowriter custom tool definitions, ready for `createAgentSession({ customTools })`.
 */
export const allKleptowriterTools = [
  writeSceneTool,
  readSceneTool,
  listScenesTool,
  queryMetadataTool,
  updateMetadataTool,
  evaluateProseTool,
  loadContextTool,
  suggestNextBeatTool,
  deduceChaptersTool,
  listNarrativeTemplatesTool,
  getProjectVersionTool,
  webSearchTool,
  webFetchTool,
];
