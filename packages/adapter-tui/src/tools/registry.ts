/**
 * Tool registry — aggregates all 11 Kleptowriter custom tool definitions.
 *
 * Re-exports real implementations from their respective modules.
 * Used by session.ts to pass the full tool set to createAgentSession().
 */

import { writeSceneTool, readSceneTool, listScenesTool } from "./scene-tools.js";
import { queryBibleTool, updateBibleTool } from "./bible-tools.js";
import { evaluateProseTool } from "./eval-tools.js";
import { loadContextTool } from "./context-tools.js";
import { suggestNextBeatTool } from "./markov-tools.js";
import { deduceChaptersTool } from "./chapter-tools.js";
import { webSearchTool } from "./web-search-tools.js";
import { listNarrativeTemplatesTool } from "./narrative-tools.js";

export {
  writeSceneTool,
  readSceneTool,
  listScenesTool,
  queryBibleTool,
  updateBibleTool,
  evaluateProseTool,
  loadContextTool,
  suggestNextBeatTool,
  deduceChaptersTool,
  listNarrativeTemplatesTool,
  webSearchTool,
};

export { setBible, getBible, getBiblePath } from "./bible-tools.js";
export { getSceneStore } from "./scene-tools.js";

/**
 * All 11 Kleptowriter custom tool definitions, ready for `createAgentSession({ customTools })`.
 */
export const allKleptowriterTools = [
  writeSceneTool,
  readSceneTool,
  listScenesTool,
  queryBibleTool,
  updateBibleTool,
  evaluateProseTool,
  loadContextTool,
  suggestNextBeatTool,
  deduceChaptersTool,
  listNarrativeTemplatesTool,
  webSearchTool,
];
