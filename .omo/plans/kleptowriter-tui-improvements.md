# Kleptowriter TUI Improvements

## TL;DR

> **Quick Summary**: Fix 6 critical issues in Kleptowriter's TUI — enable Pi built-in tools (read/write/export), wire bible persistence, rename bible.json to story-metadata.json, add web_search tool (DuckDuckGo free backend), and update the system prompt for proactive intent-detection agent behavior.
>
> **Deliverables**:
> - Both adapters (adapter-tui + adapter-pi) fixed with bible persistence wired
> - Pi built-in tools enabled (read/write/grep/ls/find) with bash excluded
> - Custom `web_search` tool added (DuckDuckGo free backend, zero dependencies)
> - `bible.json` renamed to `story-metadata.json` across all references
> - System prompt updated for proactive intent-detection agent behavior
> - Project marker visible via non-hidden story-metadata.json
>
> **Estimated Effort**: Medium — ~30 files touched across two near-identical adapter packages
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: Path alignment (bible.json→story-metadata.json) → tool wiring → testing

---

## Context

### Original Request
The user reported 6 problems with the Kleptowriter TUI:
1. Agent cannot read files — `noTools: "builtin"` disables all Pi built-in tools (read, write, edit, bash, grep, find, ls)
2. Agent cannot write files or export session chats — same root cause
3. Agent cannot search online — no web search tool
4. Agent is passive — never detects intent, never routes to appropriate agent modes
5. Project marker never created — only a hidden `.kleptowriter.json` exists, no visible marker
6. `bible.json` never updated — `setBible()` never called from session setup, bible-tools singleton has no save path

### Interview Summary
**Key Decisions**:
- **Both adapters**: Fix both `adapter-tui` AND `adapter-pi` — they have identical bugs
- **Project marker**: Rename `bible.json` → `story-metadata.json` (visible, no religious connotation). This IS the visible marker.
- **Export**: Pi built-in `/export` command — just need to re-enable Pi built-in tools
- **Web search**: Integrate web search via a custom tool using DuckDuckGo HTML backend (free, no API key) — simpler than Pi package management, swap for pi-websearch later if multi-backend needed
- **Agent routing**: Intent-detection based — agent should detect world-building, ingestion, interview, narrative-structure, scene-writing intents and route appropriately

### Metis Review
**Identified Gaps** (addressed):
- Both adapter packages need same fixes — confirmed, both in scope
- `excludeTools` exists in Pi SDK (checked SDK types) — can use it to filter out `bash`
- Test strategy needed — added: tests-after with `bun test` + agent QA
- `loadContextTool` already loads bible — should call `setBible()` inside `execute()` to wire singleton

---

## Work Objectives

### Core Objective
Fix all 6 TUI problems by enabling Pi built-in tools with targeted exclusions, wiring bible persistence, renaming bible.json to story-metadata.json, adding web_search tool (DuckDuckGo backend), and updating the agent system prompt for proactive intent-detection behavior.

### Concrete Deliverables
- `packages/adapter-tui/src/session.ts` — wired with bible persistence + enabled tools
- `packages/adapter-tui/src/tools/context-tools.ts` — calls `setBible()` after loading
- `packages/adapter-tui/src/tools/bible-tools.ts` — updated for `story-metadata.json` path
- `packages/adapter-tui/src/tools/types.ts` — new `list_narrative_templates` tool types
- `packages/adapter-tui/src/tools/narrative-tools.ts` — NEW: `list_narrative_templates` tool
- `packages/adapter-tui/src/tools/registry.ts` — register new tool
- `packages/adapter-tui/src/prompt/system.md` — updated for intent-detection routing
- `packages/adapter-tui/src/bible/persistence.ts` — updated paths for `story-metadata.json`
- `packages/adapter-tui/src/project-detect.ts` — updated for `story-metadata.json`
- `packages/adapter-pi/` — same changes mirrored
- `packages/adapter-tui/src/tools/bible-tools.ts` — ref path update
- Custom `web_search` tool (DuckDuckGo HTML backend, zero deps)

### Must Have
- bible persistence: `update_bible` calls auto-save to `story-metadata.json`
- Pi built-in tools enabled: read, write, grep, find, ls, edit available; bash excluded
- `/export` Pi command works for session export
- Web search works via custom `web_search` tool (DuckDuckGo HTML backend, no API key)
- System prompt updated: agent detects user intent and routes to appropriate phase
- `list_narrative_templates` tool available for the agent to use
- `bible.json` → `story-metadata.json` rename complete across both adapters
- Existing 9 Kleptowriter tools unchanged and working
- All existing tests still pass

### Must NOT Have (Guardrails)
- No sub-agent architecture — Pi SDK doesn't support it, use prompt-based routing
- No modifications to kleptowriter-core narrative templates (12 templates already exist)
- No new npm dependencies — custom web_search uses built-in `fetch`
- No custom file browser — Pi's built-in read/write tools are sufficient
- No bash tool enabled — system prompt guardrails against dangerous commands
- No changes to existing tool implementations (write_scene, read_scene, etc.)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Bun test + `bun:test` + typebox)
- **Automated tests**: Tests-after (fixing existing code, tests before/after each change)
- **Framework**: `bun test`

### QA Policy
Every task includes agent-executable QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Unit tests**: `bun test` — verify logic changes
- **TUI behavior**: Interactive bash (tmux) — verify Pi tools appear in session
- **File I/O verification**: Bash — verify story-metadata.json is created/updated
- **Web search**: Bash — verify web_search tool is registered and responds to query

---

## Execution Strategy

```
Wave 1 (Path alignment — rename bible.json → story-metadata.json):
├── Task 1: Update persistence.ts — load/save paths + serialization name
├── Task 2: Update project-detect.ts — initProject writes story-metadata.json
├── Task 3: Update context-tools.ts — load from story-metadata.json
├── Task 4: Update bible-tools.ts — saveBible path default → story-metadata.json
├── Task 5: Update all test files — path references
├── Task 6: Mirror all changes to adapter-pi
└── Task 7: bun test — verify all paths green

Wave 2 (Capability enablement — tools + web search + persistence wiring):
├── Task 8: session.ts — remove noTools:"builtin", add excludeTools:["bash"]
├── Task 9: session.ts — wire setBible() after load_context call
├── Task 10: context-tools.ts execute() — call setBible() with loaded bible
├── Task 11: Create web_search tool (DuckDuckGo fetch backend)
├── Task 12: Add list_narrative_templates tool
├── Task 13: Mirror session.ts + context-tools.ts + tool changes to adapter-pi
└── Task 14: bun test — verify tools are available + bible persists

Wave 3 (Agent behavior — system prompt + intent routing):
├── Task 15: Update system.md — intent-detection routing instructions
├── Task 16: Mirror system.md to adapter-pi
└── Task 17: Integration test + commit — verify TUI + bible persistence

Wave FINAL (4 parallel reviews + user signoff):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

---

## TODOs

- [x] 1. Check `bible/persistence.ts` for bible.json references + update error messages in both adapters

  **What to do**:
  - `persistence.ts` takes file paths as parameters (no hardcoded `bible.json` paths) — still check for:
    1. Any hardcoded `bible.json` strings in error messages, comments, or default values
    2. The `SerializableBible` interface (keep same structure, just verify)
    3. Update any error messages that reference "bible" in the literal file-path sense
  - Keep variable names as-is (code can call it bible internally), only change FILE references
  - Check if any place in persistence.ts hardcodes `"bible.json"` as a default path

  **Must NOT do**:
  - Do NOT rename TypeScript variables, classes, or functions named "bible" — only the file path
  - Do NOT change the JSON serialization format — only the file name

  **Recommended Agent Profile**:
  - **Category**: `quick` — mechanical find-and-replace of file paths, no logic changes
  - **Skills**: `[]` — no special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Task 4 (bible-tools.ts requires persistence.ts to exist)
  - **Blocked By**: None

  **References**:
  - `src/bible/persistence.ts` — the file to modify, look for hardcoded `bible.json` strings
  - `src/bible/persistence.test.ts` — update test references

  **Acceptance Criteria**:
  - [ ] All hardcoded `"bible.json"` strings in persistence.ts changed to `"story-metadata.json"`
  - [ ] All `bible.json` references in persistence.test.ts changed to `story-metadata.json`
  - [ ] `bun test packages/adapter-tui/src/bible/persistence.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Verify path constant is updated
    Tool: Bash
    Steps:
      1. grep "bible\\.json" packages/adapter-tui/src/bible/persistence.ts
    Expected Result: No matches — all references changed to story-metadata.json
    Failure Indicators: Any match for bible.json in persistence.ts
    Evidence: .omo/evidence/task-01-paths-check.log

  Scenario: Tests pass after rename
    Tool: Bash
    Steps:
      1. bun test packages/adapter-tui/src/bible/persistence.test.ts
    Expected Result: All tests PASS
    Evidence: .omo/evidence/task-01-tests-pass.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 2. Update `project-detect.ts` — initProject writes story-metadata.json instead of bible.json

  **What to do**:
  - In `packages/adapter-tui/src/project-detect.ts`: Change the `initProject()` function to:
    1. Write `story-metadata.json` instead of `story/bible.json` (use `story-metadata.json` directly in the `story/` directory)
    2. Add a `projectMarker` field: `{ "type": "kleptowriter-project", "version": 1 }` at the top of the JSON
    3. Update the comment/docs to reference `story-metadata.json`

  **Must NOT do**:
  - Do NOT change the `ProjectManifest` interface — it's for `.kleptowriter.json`, leave it
  - Do NOT remove `.kleptowriter.json` creation — keep BOTH

  **Recommended Agent Profile**:
  - **Category**: `quick` — single file, clear changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)

  **References**:
  - `src/project-detect.ts:97-124` — `initProject()` function, currently writes `story/bible.json`
  - `packages/adapter-pi/src/cli.ts` — check if this also creates bible.json

  **Acceptance Criteria**:
  - [ ] `initProject()` creates `story/story-metadata.json` (NOT `story/bible.json`)
  - [ ] The marker JSON includes `{ "type": "kleptowriter-project", "version": 1 }`
  - [ ] `.kleptowriter.json` is still created (unchanged)

  **QA Scenarios**:
  ```
  Scenario: initProject creates story-metadata.json
    Tool: Bash
    Steps:
      1. mkdir -p /tmp/kp-test && cd /tmp/kp-test
      2. bun run /workspace/kleptowriter/packages/adapter-tui/src/cli.ts < /dev/null 2>&1 &
      3. ls story/story-metadata.json
    Expected Result: story-metadata.json exists
    Evidence: .omo/evidence/task-02-marker-created.log

  Scenario: Marker contains correct type field
    Tool: Bash
    Steps:
      1. cat /tmp/kp-test/story/story-metadata.json | head -5
    Expected Result: JSON contains "type": "kleptowriter-project"
    Evidence: .omo/evidence/task-02-marker-type.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 3. Update `context-tools.ts` — load from story-metadata.json and call setBible()

  **What to do**:
  - In `packages/adapter-tui/src/tools/context-tools.ts`:
    1. Change `DEFAULT_BIBLE_PATH` from `./story/bible.json` to `./story/story-metadata.json`
    2. After `loadBible()` succeeds, call `setBible(bible, DEFAULT_BIBLE_PATH)` to wire the module-level singleton
    3. Import `setBible` from `../bible/persistence.js` — actually from `./bible-tools.js` (registry)

  **Must NOT do**:
  - Do NOT change the loadContext tool's behavior or return format
  - Do NOT change the bible serialization format for context injection

  **Recommended Agent Profile**:
  - **Category**: `quick` — clear, bounded changes

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 1 (persistence.ts path changes)

  **References**:
  - `src/tools/context-tools.ts:19-21` — path constants at top of file
  - `src/tools/context-tools.ts:43-47` — `loadBible()` call in execute()
  - `src/tools/bible-tools.ts:23-25` — `setBible()` function signature
  - `src/tools/registry.ts:27` — `setBible` is exported from registry

  **Acceptance Criteria**:
  - [ ] `DEFAULT_BIBLE_PATH` changed to `./story/story-metadata.json`
  - [ ] `setBible(bible, path)` called after `loadBible()` in execute()
  - [ ] Import of `setBible` added from correct module
  - [ ] `bun test packages/adapter-tui/src/tools/context-tools.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Path constant updated
    Tool: Bash
    Steps:
      1. grep -n "bible.json" packages/adapter-tui/src/tools/context-tools.ts
    Expected Result: No matches
    Evidence: .omo/evidence/task-03-path-constant.log

  Scenario: setBible is called
    Tool: Bash
    Steps:
      1. grep -n "setBible" packages/adapter-tui/src/tools/context-tools.ts
    Expected Result: Shows import + call in execute()
    Evidence: .omo/evidence/task-03-setbible-call.log

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. bun test packages/adapter-tui/src/tools/context-tools.test.ts
    Expected Result: PASS
    Evidence: .omo/evidence/task-03-tests.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 4. Update `bible-tools.ts` — save path default → story-metadata.json

  **What to do**:
  - In `packages/adapter-tui/src/tools/bible-tools.ts`:
    1. The `setBible()` function already accepts an optional savePath — this is fine
    2. `updateBibleTool.execute()` already calls `saveBible(_bible, _biblePath)` if path is set — this is fine
    3. No code changes needed if context-tools.ts now calls `setBible(bible, "./story/story-metadata.json")`
  - Just verify the wiring is correct and add a default path constant if desired:
    1. Add `const DEFAULT_SAVE_PATH = "./story/story-metadata.json";` at top
    2. If `_biblePath` is not set but `_bible` has entries, auto-save to default
  - Also update any default bible.json path references in error messages

  **Must NOT do**:
  - Do NOT change the bible operations (query, update) — only path handling

  **Recommended Agent Profile**:
  - **Category**: `quick` — minimal logic change, mostly verification

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 1 (persistence.ts)

  **References**:
  - `src/tools/bible-tools.ts:19-36` — module-level _bible and _biblePath
  - `src/tools/bible-tools.ts:174-177` — auto-save in update_bible
  - `src/tools/bible-tools.ts:126-131` — updateBible tool definition

  **Acceptance Criteria**:
  - [ ] `DEFAULT_SAVE_PATH = "./story/story-metadata.json"` added
  - [ ] All bible.json strings in error messages updated
  - [ ] `bun test packages/adapter-tui/src/tools/bible-tools.test.ts` → PASS (or relevant test)

  **QA Scenarios**:
  ```
  Scenario: No bible.json references remain
    Tool: Bash
    Steps:
      1. grep -n "bible\\.json" packages/adapter-tui/src/tools/bible-tools.ts
    Expected Result: No matches (or only in comments referring to the concept, not file paths)
    Evidence: .omo/evidence/task-04-paths-clean.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 5. Update all test files — path references from bible.json to story-metadata.json

  **What to do**:
  - Find all test files under `packages/adapter-tui/src/` and `packages/adapter-pi/src/` that reference `"bible.json"` as a file path
  - Update them to reference `"story-metadata.json"`
  - Use grep to find all occurrences

  **Recommended Agent Profile**:
  - **Category**: `quick` — mechanical find-and-replace

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - Use `grep -r "bible\\.json" packages/adapter-tui/src/ packages/adapter-pi/src/` to find all occurrences

  **Acceptance Criteria**:
  - [ ] No test files reference `"bible.json"` as a file path
  - [ ] All tests that test file I/O now reference `"story-metadata.json"`
  - [ ] `bun test` passes for both packages

  **QA Scenarios**:
  ```
  Scenario: No stray bible.json references
    Tool: Bash
    Steps:
      1. rtk grep -r "bible\\.json" packages/adapter-tui/src/ packages/adapter-pi/src/ --include "*.ts"
    Expected Result: Only references in comments/strings about the CONCEPT, not file paths
    Evidence: .omo/evidence/task-05-grep-clean.log

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. bun test
    Expected Result: All tests PASS
    Evidence: .omo/evidence/task-05-tests.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 6. Mirror all Task 1-5 changes to adapter-pi package

  **What to do**:
  - The `packages/adapter-pi/` package has duplicated code from `adapter-tui/`
  - Apply the same changes:
    - `packages/adapter-pi/src/bible/persistence.ts` — path changes
    - `packages/adapter-pi/src/tools/context-tools.ts` — path + setBible() call
    - `packages/adapter-pi/src/tools/bible-tools.ts` — path defaults
    - `packages/adapter-pi/src/bible/persistence.test.ts` — path in tests
    - `packages/adapter-pi/src/tools/context-tools.test.ts` — path in tests
    - Any other bible.json references

  **Recommended Agent Profile**:
  - **Category**: `quick` — mechanical mirror, same patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Tasks 1-5)
  - **Parallel Group**: Wave 1

  **Acceptance Criteria**:
  - [ ] All same changes applied to adapter-pi package
  - [ ] `bun test packages/adapter-pi/` → PASS

  **QA Scenarios**:
  ```
  Scenario: No bible.json in adapter-pi
    Tool: Bash
    Steps:
      1. rtk grep "bible\\.json" packages/adapter-pi/src/
    Expected Result: No matches (except conceptual references)
    Evidence: .omo/evidence/task-06-adapter-pi-clean.log

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. bun test
    Expected Result: PASS
    Evidence: .omo/evidence/task-06-tests.log
  ```

  **Commit**: NO (groups with Task 7)

- [x] 7. Bundle commit — all path changes with verification

  **What to do**:
  - After all path changes (Tasks 1-6) are complete, commit together
  - Message: `refactor(adapter): rename bible.json to story-metadata.json across both adapters`

  **Must NOT do**:
  - Do NOT include capability/wiring changes in this commit — keep it focused on the rename

  **Recommended Agent Profile**:
  - **Category**: `git` — use `/git-master` skill
  - **Skills**: `["git-master"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO — depends on all Wave 1 tasks
  - **Blocks**: Wave 2
  - **Blocked By**: Tasks 1-6

  **Acceptance Criteria**:
  - [ ] `bun test` passes
  - [ ] `rtk git diff --stat` shows only path reference changes
  - [ ] Commit message matches: `refactor(adapter): rename bible.json to story-metadata.json across both adapters`

  **QA Scenarios**:
  ```
  Scenario: Git diff is clean
    Tool: Bash
    Steps:
      1. rtk git diff --stat
    Expected Result: Only shows .ts file changes, no unexpected files
    Evidence: .omo/evidence/task-07-diff.log
  ```

  **Commit**: YES
  - Message: `refactor(adapter): rename bible.json to story-metadata.json across both adapters`
  - Pre-commit: `bun test`

- [x] 8. session.ts — remove noTools:"builtin", add excludeTools for bash

  **What to do**:
  - In `packages/adapter-tui/src/session.ts`:
    1. Change `noTools: "builtin"` — remove this line (don't set noTools at all)
    2. Add `excludeTools: ["bash"]` to both `createAgentSessionServices` calls (lines 24-34 and 49-60)
    3. Verify the `createAgentSessionFromServices` calls use these options

  **Must NOT do**:
  - Do NOT forget the second `createAgentSessionServices` call in the runtime callback

  **Recommended Agent Profile**:
  - **Category**: `quick` — small, targeted change

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9, 11, 12
  - **Blocked By**: Task 7 (rename must be committed first)

  **References**:
  - `src/session.ts:24-34` — first `createAgentSessionServices` call with `noTools: "builtin"` at line 31
  - `src/session.ts:49-60` — second call in runtime callback with `noTools: "builtin"` at line 56
  - SDK types show `excludeTools?: string[]` is available

  **Acceptance Criteria**:
  - [ ] Both `createAgentSessionServices` calls have `noTools` removed
  - [ ] Both calls have `excludeTools: ["bash"]` added
  - [ ] `bun test packages/adapter-tui/src/session.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: noTools removed from session.ts
    Tool: Bash
    Steps:
      1. grep -n "noTools" packages/adapter-tui/src/session.ts
    Expected Result: No matches (or only in comments, not as a property)
    Evidence: .omo/evidence/task-08-notools-removed.log
  ```

  **Commit**: NO (groups with Task 10)

- [x] 9. session.ts — wire setBible() after session startup

  **What to do**:
  - In `packages/adapter-tui/src/session.ts`:
    1. Import `setBible` from `./tools/registry.js`
    2. Import `loadBible` from `./bible/persistence.js`
    3. After session creation, right before returning the `InteractiveMode` instance:
    ```typescript
    import { setBible } from "./tools/registry.js";
    import { loadBible } from "./bible/persistence.js";
    import { join } from "node:path";
    // In createTuiSession(), after session creation:
    const biblePath = join(cwd, "story", "story-metadata.json");
    const bible = await loadBible(biblePath);
    setBible(bible, biblePath);
    ```

  **Must NOT do**:
  - Do NOT call setBible() mid-session-creation — do it after the created session

  **Recommended Agent Profile**:
  - **Category**: `quick` — small change, critical wiring

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (with Task 8)
  - **Blocked By**: Task 1 (path rename), Task 8 (tools enabled)

  **References**:
  - `src/tools/registry.ts:27` — `setBible` is exported
  - `src/session.ts:107-108` — right before `return new InteractiveMode(...)` is the place
  - `src/bible/persistence.ts:182-209` — `loadBible()` function

  **Acceptance Criteria**:
  - [ ] `setBible` imported from `./tools/registry.js`
  - [ ] `loadBible` imported from `./bible/persistence.js`
  - [ ] Bible loaded and wired after session creation
  - [ ] `bun test` → PASS

  **QA Scenarios**:
  ```
  Scenario: setBible imported and referenced
    Tool: Bash
    Steps:
      1. grep -n "setBible" packages/adapter-tui/src/session.ts
    Expected Result: Shows import + call with correct path
    Evidence: .omo/evidence/task-09-setbible-wired.log
  ```

  **Commit**: NO (groups with Task 10)

- [x] 10. Verify context-tools.ts already calls setBible() after loading

  **What to do**:
  - Verification task — confirm Task 3 already did this correctly
  - In `packages/adapter-tui/src/tools/context-tools.ts`, verify the `execute()` function calls `setBible()` after `loadBible()`
  - This ensures both startup (via session.ts) and mid-session (via load_context tool) wire the bible singleton

  **Recommended Agent Profile**:
  - **Category**: `quick` — read-only verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 3 (setBible call in context-tools.ts)

  **References**:
  - `src/tools/context-tools.ts:43-47` — execute() function

  **Acceptance Criteria**:
  - [ ] `context-tools.ts` has `setBible` imported
  - [ ] `setBible(bible, biblePath)` called after `loadBible()` in execute()
  - [ ] `bun test` → PASS

  **QA Scenarios**:
  ```
  Scenario: setBible call confirmed in context-tools
    Tool: Bash
    Steps:
      1. grep -n "setBible" packages/adapter-tui/src/tools/context-tools.ts
    Expected Result: Shows import + at least one call site
    Evidence: .omo/evidence/task-10-setbible-context-tools.log
  ```

  **Commit**: YES (groups with 8-9)
  - Message: `fix(adapter): enable Pi built-in tools and wire bible persistence in session.ts`
  - Pre-commit: `bun test`

- [x] 11. Add web_search custom tool (DuckDuckGo free backend)

  **What to do**:
  - Create `packages/adapter-tui/src/tools/web-search-tools.ts`:
    - Use `defineTool` from Pi SDK
    - Tool name: `web_search`
    - Parameters: `query: string` (required), `maxResults: number` (optional, default 8)
    - Uses `fetch` to query `https://html.duckduckgo.com/html/?q={query}`
    - Parses the HTML response for result links (`.result__a`, `.result__snippet`)
    - Returns structured results: `[{ title, url, snippet }]`
    - Graceful error handling if fetch fails or no results
    - No external dependencies needed — uses built-in `fetch`

  - Register in `packages/adapter-tui/src/tools/registry.ts`:
    - Import `webSearchTool` from `./web-search-tools.js`
    - Add to `allKleptowriterTools` array
    - Export it

  **Must NOT do**:
  - Do NOT add npm dependencies — built-in `fetch` is sufficient
  - Do NOT add multi-backend support — DuckDuckGo backend is sufficient for initial use
  - Do NOT store API keys or require configuration

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high` — involves HTML parsing + fetch integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 12)

  **References**:
  - `src/tools/bible-tools.ts` — follow tool pattern: defineTool, textContent, parameters schema
  - `src/tools/registry.ts:33-43` — how tools are registered

  **Acceptance Criteria**:
  - [ ] `web-search-tools.ts` created with `webSearchTool`
  - [ ] `webSearchTool` registered in registry.ts and added to `allKleptowriterTools`
  - [ ] Tool accepts `query` string parameter
  - [ ] Tool returns structured results when called
  - [ ] Handles network errors gracefully

  **QA Scenarios**:
  ```
  Scenario: web_search tool file exists
    Tool: Bash
    Steps:
      1. ls packages/adapter-tui/src/tools/web-search-tools.ts
    Expected Result: File exists
    Evidence: .omo/evidence/task-11-file-exists.log

  Scenario: Tool registered in registry
    Tool: Bash
    Steps:
      1. grep -n "web_search" packages/adapter-tui/src/tools/registry.ts
    Expected Result: Shows webSearchTool imported and in allKleptowriterTools
    Evidence: .omo/evidence/task-11-registered.log
  ```
  Note: The tool is a DuckDuckGo HTML scraper. DuckDuckGo may change their HTML structure over time, but this is the simplest zero-config approach.

  **Commit**: NO (groups with Task 14)

- [x] 12. Add list_narrative_templates tool

  **What to do**:
  - Create `packages/adapter-tui/src/tools/narrative-tools.ts`:
    ```typescript
    import { defineTool } from "@earendil-works/pi-coding-agent";
    import { Type } from "@sinclair/typebox";
    import { templateRegistry } from "@kleptowriter/kleptowriter-core/narrative/templates/index.js";

    export const listNarrativeTemplatesTool = defineTool({
      name: "list_narrative_templates",
      label: "List Narrative Templates",
      description: "Lists all available narrative structure templates (Hero's Journey, Three-Act Structure, etc.) with descriptions and beat counts.",
      parameters: Type.Object({}),
      execute: async () => {
        const names = templateRegistry.listStructures();
        const templates = names.map(name => ({
          name,
          description: templateRegistry.getStructure(name)?.description ?? "",
          beatCount: templateRegistry.getStructure(name)?.beats.length ?? 0,
        }));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(templates, null, 2) }],
          details: { templates, count: templates.length },
        };
      },
    });
    ```
  - Register in registry.ts: import + add to allKleptowriterTools

  **Must NOT do**:
  - Do NOT modify narrative templates — read-only tool
  - Do NOT add a "set active template" tool — agent uses tool output conversationally

  **Recommended Agent Profile**:
  - **Category**: `quick` — simple tool, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 11)

  **References**:
  - `src/tools/bible-tools.ts` — follow tool pattern
  - `src/narrative/templates/index.ts` — templateRegistry
  - `src/narrative/templates/types.ts` — NarrativeStructure type

  **Acceptance Criteria**:
  - [ ] `narrative-tools.ts` created with `listNarrativeTemplatesTool`
  - [ ] Tool registered in `registry.ts` and added to `allKleptowriterTools`
  - [ ] Tool returns all 12 narrative structures with descriptions
  - [ ] `bun test` → PASS

  **QA Scenarios**:
  ```
  Scenario: Tool file created
    Tool: Bash
    Steps:
      1. ls packages/adapter-tui/src/tools/narrative-tools.ts
    Expected Result: File exists
    Evidence: .omo/evidence/task-12-file-exists.log

  Scenario: Tool registered in registry
    Tool: Bash
    Steps:
      1. grep -n "list_narrative_templates" packages/adapter-tui/src/tools/registry.ts
    Expected Result: Shows import and in allKleptowriterTools
    Evidence: .omo/evidence/task-12-registered.log
  ```

  **Commit**: NO (groups with Task 14)

- [x] 13. Mirror session.ts + tool changes to adapter-pi (note: different structure)

  **What to do**:
  - adapter-pi's `session.ts` has a DIFFERENT structure from adapter-tui:
    - Single `createAgentSessionFromServices` call (no `createAgentSessionRuntime`)
    - Calls `invokeLoadContext()` directly at startup (line 55) which calls `loadContextTool.execute()`
  - Apply changes:
    1. Remove `noTools: "builtin"` from `createAgentSessionServices` call (line 50)
    2. Add `excludeTools: ["bash"]` to the options
    3. Wire `setBible()` — NOT in session creation (different structure) but INSIDE `invokeLoadContext()`:
       - In `invokeLoadContext()` (lines 86-100), the function already calls `loadContextTool.execute()`
       - Task 3 already made `loadContextTool.execute()` call `setBible()` after loading the bible
       - So the adapter-pi should work automatically after Task 3 is mirrored
       - BUT verify: if adapter-pi's `loadContextTool` is the same one from registry, the setBible wiring propagates
    4. Create `tools/web-search-tools.ts` and `tools/narrative-tools.ts` (same as adapter-tui)
    5. Update `tools/registry.ts` to register new tools

  **Recommended Agent Profile**:
  - **Category**: `quick` — mirror changes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocked By**: Tasks 8-12 (adapter-tui versions)

  **Acceptance Criteria**:
  - [ ] All Wave 2 changes mirrored to adapter-pi
  - [ ] `bun test packages/adapter-pi/` → PASS

  **QA Scenarios**:
  ```
  Scenario: noTools removed from adapter-pi session
    Tool: Bash
    Steps:
      1. grep -n "noTools" packages/adapter-pi/src/session.ts
    Expected Result: No matches
    Evidence: .omo/evidence/task-13-notools-pi.log

  Scenario: web_search registered in adapter-pi
    Tool: Bash
    Steps:
      1. grep -n "web_search" packages/adapter-pi/src/tools/registry.ts
    Expected Result: Shows import + in allKleptowriterTools
    Evidence: .omo/evidence/task-13-websearch-pi.log
  ```

  **Commit**: NO (groups with Task 14)

- [x] 14. Bundle commit — all capability changes

  **What to do**:
  - Commit all Wave 2 changes together
  - Message: `feat(adapter): enable Pi built-in tools, add web_search and list_narrative_templates tool, wire bible persistence`

  **Recommended Agent Profile**:
  - **Category**: `git` — use `/git-master` skill
  - **Skills**: `["git-master"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Wave 3
  - **Blocked By**: Tasks 8-13

  **Acceptance Criteria**:
  - [ ] `bun test` passes
  - [ ] `rtk git diff --stat` shows expected files changed

  **Commit**: YES
  - Message: `feat(adapter): enable Pi built-in tools, add web_search and list_narrative_templates tool, wire bible persistence`
  - Pre-commit: `bun test`

- [x] 15. Update system prompt for intent-detection agent routing

  **What to do**:
  - In `packages/adapter-tui/src/prompt/system.md`:
    - Add a new section called "## Intent Detection and Proactive Guidance" BEFORE the existing "## The Four-Phase Workflow" section
    - The new section should instruct the agent to:
      1. **Detect user intent**: From the user's message, detect what phase they're in — world-building, material ingestion, interview/narrative planning, narrative structure selection, scene writing, or revision
      2. **Route proactively**: Based on detected intent, guide the user to the right tools and phase
      3. **Suggest next steps**: After each scene or phase completion, proactively suggest what to do next
      4. **Narrative structure awareness**: On fresh projects (no scenes exist), proactively ask about narrative structure preference, listing available templates via `list_narrative_templates`
      5. **Context transitions**: If the user switches topics mid-conversation, detect the shift and adjust

  - Keep the existing phase workflow descriptions intact — add to them, don't replace
  - Be specific about what "proactive" means: concrete behaviors, not generic "be helpful"
  - Mirror the same changes to `packages/adapter-pi/src/prompt/system.md`

  **Draft content** (to be refined by the agent):

  ```markdown
  ## Intent Detection and Proactive Guidance

  You are not a passive assistant waiting for commands. You actively detect the novelist's intent
  and guide them to the right phase and tools. This is key to a productive writing session.

  ### Detecting Intent

  From the novelist's message, classify their intent:

  | Intent Cues | Phase | Action |
  |------------|-------|--------|
  | "I want to write about...", "My story is set in...", "The main character is..." | Material Ingestion | Use `update_bible` to record premise, characters, setting. Ask open-ended questions to draw out details. |
  | "I'm not sure about the plot...", "What should happen next?", "Help me plan..." | Interview / Narrative Planning | Discuss dramatic tension, character arcs, story structure. Suggest narrative template via `list_narrative_templates`. |
  | "Let me pick a structure...", "What story structures are there?" | Narrative Structure Selection | Call `list_narrative_templates` proactively and discuss options with the novelist. |
  | "Write the opening scene...", "Let's draft...", "Scene where..." | Scene Writing | Move to scene composition. Plan first, then compose with `write_scene`. |
  | "Review this...", "Does this work?", "Let me see what I have..." | Revision | Use `evaluate_prose`, `deduce_chapters`, `list_scenes` as appropriate. |

  ### Proactive Behaviors

  1. **At project start** (no scenes written, no bible entries): Proactively ask:
     - "What kind of story are you writing?" (genre, tone)
     - "Would you like to explore different narrative structures? I have 12 templates including Hero's Journey, Three-Act Structure, Kishotenketsu, and more."
     - Call `list_narrative_templates` to show the novelist their options.

  2. **After each scene**: Review what was written. Does continuity hold? Suggest the next narrative beat using your understanding of the story's structure.

  3. **After 3-5 scenes**: Proactively suggest a revision pass. Call `deduce_chapters` to show chapter groupings. Check character consistency.

  4. **On intent shifts**: If the novelist starts talking about a character's backstory mid-scene-writing, recognize the shift to "world-building" and use `update_bible` to capture the information before returning to the scene.

  5. **When stuck**: If the writer seems uncertain ("I don't know what happens next"), offer narrative beat suggestions, ask about character motivations, or suggest consulting a different narrative template.

  You have `list_narrative_templates` to discover available structures, `web_search` to research topics online, and Pi's built-in `read`, `write`, `edit`, `grep`, `find`, `ls` tools for file operations within the project directory. Use these proactively.
  ```

  **Must NOT do**:
  - Do NOT remove the existing four-phase workflow description
  - Do NOT add instructions that contradict existing creative control guidelines
  - Do NOT make the agent pushy — "proactively suggest" is not "insist"

  **Recommended Agent Profile**:
  - **Category**: `writing` — prose/documentation task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 16)

  **References**:
  - `src/prompt/system.md` — existing system prompt, read it fully before editing
  - `src/prompt/system.md:46-50` — existing phase workflow section header

  **Acceptance Criteria**:
  - [ ] New "Intent Detection and Proactive Guidance" section added to system.md
  - [ ] Section includes intent classification table
  - [ ] Section includes 5 proactive behavior rules
  - [ ] Existing phase workflow content is preserved
  - [ ] Agent mentions available tools (list_narrative_templates, web_search, built-in Pi tools)

  **QA Scenarios**:
  ```
  Scenario: Intent Detection section added
    Tool: Bash
    Steps:
      1. grep -c "Intent Detection" packages/adapter-tui/src/prompt/system.md
    Expected Result: ≥1 (section exists)
    Evidence: .omo/evidence/task-15-intent-section.log

  Scenario: Four phases preserved
    Tool: Bash
    Steps:
      1. grep -c "The Four-Phase Workflow" packages/adapter-tui/src/prompt/system.md
    Expected Result: ≥1 (existing content preserved)
    Evidence: .omo/evidence/task-15-phases-preserved.log
  ```

  **Commit**: NO (groups with Task 17)

- [x] 16. Mirror system.md changes to adapter-pi

  **What to do**:
  - Copy the updated system prompt from `adapter-tui/src/prompt/system.md` to `adapter-pi/src/prompt/system.md`
  - Verify the adapter-pi doesn't have any custom system prompt additions that would be lost — if so, merge carefully

  **Recommended Agent Profile**:
  - **Category**: `quick` — file copy

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 15)

  **Acceptance Criteria**:
  - [ ] adapter-pi system.md has same intent detection section
  - [ ] adapter-pi builds/typechecks

  **QA Scenarios**:
  ```
  Scenario: adapter-pi has intent detection section
    Tool: Bash
    Steps:
      1. grep -c "Intent Detection" packages/adapter-pi/src/prompt/system.md
    Expected Result: ≥1
    Evidence: .omo/evidence/task-16-intent-pi.log
  ```

  **Commit**: NO (groups with Task 17)

- [x] 17. Integration test + commit

  **What to do**:
  - Build both packages: `bun run build`
  - Run all tests: `bun test`
  - Verify the adapter-tui can start (no crash)
  - Commit with message: `feat(agent): update system prompt for proactive intent-detection routing`

  **Recommended Agent Profile**:
  - **Category**: `git` — bundling + git
  - **Skills**: `["git-master"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Tasks 15-16

  **Acceptance Criteria**:
  - [ ] `bun run build` passes
  - [ ] `bun test` passes
  - [ ] `rtk git diff --stat` shows only expected files

  **Commit**: YES
  - Message: `feat(agent): update system prompt for proactive intent-detection routing`
  - Pre-commit: `bun test`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command, check git log). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` and `bun test`. Review all changed files for: type suppression, empty catches, debug logging in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Verify:
  1. Create a new project in empty dir → `story/story-metadata.json` is created with marker
  2. Start TUI session → Pi built-in tools (read, write) are available
  3. Call `update_bible` on existing project → `story-metadata.json` is updated on disk
  4. Verify `web_search` tool is registered and callable
  5. Verify `list_narrative_templates` returns all 12 templates
  6. Verify `/export` command works for session export
  Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Task 7**: `refactor(adapter): rename bible.json to story-metadata.json across both adapters`
- **Task 10 (with 8-9)**: `fix(adapter): enable Pi built-in tools and wire bible persistence in session.ts`
- **Task 14 (with 11-13)**: `feat(adapter): enable Pi built-in tools, add web_search and list_narrative_templates tool, wire bible persistence`
- **Task 17 (with 15-16)**: `feat(agent): update system prompt for proactive intent-detection routing`

---

## Success Criteria

### Verification Commands
```bash
bun run build       # Expected: No type errors
bun test            # Expected: All tests pass
rtk git diff --stat # Expected: Only planned files changed
```

### Final Checklist
- [x] All "Must Have" implemented and verified
- [x] All "Must NOT Have" absent (no forbidden patterns)
- [x] `bun test` passes
- [x] `bun run build` passes
- [x] bible persistence: `update_bible` saves to `story-metadata.json` on disk
- [x] Pi built-in tools: `read`, `write`, `grep`, `find`, `ls` available to agent
- [x] Pi `bash` tool excluded from agent
- [x] `/export` command works for session export
- [x] `web_search` tool registered and functional
- [x] `list_narrative_templates` tool returns 12 narrative structures
- [x] System prompt includes "Intent Detection and Proactive Guidance" section
- [x] Both adapter-tui AND adapter-pi have identical fixes applied
- [x] `.omo/evidence/` contains evidence files for all QA scenarios
- [x] All commits pushed
