/**
 * Tool registry — aggregates all 9 Kleptowriter custom tool definitions.
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
};

export { setBible, getBible, getBiblePath } from "./bible-tools.js";
export { getSceneStore } from "./scene-tools.js";

/**
 * All 9 Kleptowriter custom tool definitions, ready for `createAgentSession({ customTools })`.
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
];
