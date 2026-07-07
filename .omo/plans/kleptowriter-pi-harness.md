# Kleptowriter — Pi SDK Novel Writing Harness

## TL;DR

> **Quick Summary**: Build `@kleptowriter/adapter-pi` — a Pi SDK-powered novel writing harness that reuses Pi's agent infrastructure (LLM abstraction, tool loop, session management, compaction) with a literary system prompt and 9 custom Kleptowriter tools. Wire it to the existing `kleptowriter-core` data model so the LLM autonomously follows the narrative pipeline (ingest → interview → scene loop → revision) through conversation. Ship a thin CLI wrapper. Immediate novel writing use.
>
> **Deliverables**:
> - `packages/adapter-pi/` — Pi SDK harness integration package
> - 9 custom tools (write_scene, read_scene, list_scenes, query_bible, update_bible, evaluate_prose, load_context, suggest_next_beat, deduce_chapters)
> - Literary system prompt encoding Kleptowriter's 4-phase pipeline as default LLM behavior
> - Markov-guided beat suggestion wiring (narrative templates → beat transitions)
> - Chapter deduction tool (runs ChapterDeductor on written scenes)
> - `bible.json` persistence layer for InMemoryStoryBible
> - CLI entry point: `bun run start` (or similar) that launches Pi session with KW configuration
> - Quickstart example: novel writing workflow demonstration
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 6 waves + final verification
> **Critical Path**: Smoke test → Scaffold → Tools → Prompt → CLI → Integration

---

## Context

### Original Request
Make Kleptowriter immediately usable for writing a novel by building a Pi SDK-based harness. Abandon the 4 empty adapter stubs (OpenCode, Codex, Claude Code, Standalone) — replace them with one real integration that reuses Pi's agent infrastructure.

### Interview Summary
**Key Discussions**:
- **Workflow**: Interactive conversation with a literary AI. The AI autonomously follows Kleptowriter's pipeline phases (MaterialIngestion → Interview → SceneLoop → Revision) by default, guided by the system prompt and tool set. The user provides direction conversationally.
- **Delivery**: Minimal code — Pi's `createAgentSession()` imported directly in the Node.js process. No custom TUI. Thin CLI wrapper only. The best line of code is the one not written.
- **Scene IDs**: Semantic hierarchical naming, generic→specific left-to-right. Format: `{beat-slug}-{sequence:02d}-{slug}.md` (e.g., `rising-action-03-library-race.md`). Uses narrative beat/phase from the story structure template (setup, inciting-incident, rising-action, climax, falling-action, resolution) rather than act/chapter numbers — acts and chapters are deduced retroactively by ChapterDeductor at the end.

**Research Findings**:
- Pi SDK (`@earendil-works/pi-coding-agent`) exports `createAgentSession()` — programmatic embedding of Pi's agent loop
- `systemPromptOverride` on `DefaultResourceLoader` allows full system prompt replacement
- `noTools: "all"` disables all built-in coding tools (read/write/edit/bash)
- `customTools` arrays register LLM-callable tools with TypeBox parameter schemas
- `SessionManager` provides tree-structured session persistence, branching, labels
- `AuthStorage` + `ModelRegistry` handle API keys and model discovery
- Pi is MIT-licensed, actively maintained (16K+ stars, 1M+ weekly npm installs)
- Alternative approaches evaluated: Vercel AI SDK 7 (coding-harness abstraction, not suitable), Mastra AgentController (coding-focused, too heavy)

### Metis Review
**Identified Gaps** (addressed):
- **Bible persistence** (`InMemoryStoryBible` is ephemeral): Solved by persisting to `bible.json` on every mutation, loading at session start
- **LLM context awareness**: Solved by `load_context` tool that populates LLM context with existing bible + recent scenes
- **Adapter architecture**: Pi adapter does NOT implement the existing `HarnessAdapter` interface — it's a different pattern (single-LLM-via-tools vs multi-agent-via-registry). The new pattern is documented and intentional.
- **No changes to kleptowriter-core**: Adapter imports core, doesn't modify it
- **4 stub packages left as-is** with README deprecation note, deleted in separate cleanup
- **Pi SDK version pinned** in package.json to prevent breakage
- **Atomic file writes** for scene files (write to `.tmp`, rename) to prevent corruption
- **Smoke test first**: Validate Pi SDK `createAgentSession()` with `noTools: "all"` works before building adapter logic

---

## Work Objectives

### Core Objective
Build a Pi SDK-powered novel writing harness that makes Kleptowriter immediately usable for writing a novel through an interactive AI conversation with autonomous pipeline execution.

### Concrete Deliverables
- `packages/adapter-pi/` — complete Pi SDK integration package with:
  - 9 custom tools wrapping kleptowriter-core data model + Markov guidance + chapter deduction
  - `bible.json` persistence for story state across sessions
  - Literary system prompt encoding pipeline phases + narrative beats
  - CLI entry point (`bun run --filter @kleptowriter/adapter-pi start`)
- Smoke test script validating Pi SDK integration
- README with novel writing quickstart

### Definition of Done
- [ ] Pi session starts with Kleptowriter system prompt and custom tools
- [ ] No coding tools visible to the LLM (no bash, read, write, edit, grep, find, ls)
- [ ] User can write a scene, bible persists to disk, session resumes correctly
- [ ] `load_context` populates LLM context with existing story state on resume
- [ ] `bun run start` initializes cleanly and accepts novel writing input
- [ ] Pi session compaction handles context window overflow gracefully

### Must Have
- Pi SDK `createAgentSession()` with `noTools: "all"` and full system prompt replacement
- 9 custom tools with TypeBox parameter schemas (write_scene, read_scene, list_scenes, query_bible, update_bible, evaluate_prose, load_context, suggest_next_beat, deduce_chapters)
- `bible.json` persistence — serialized on every mutation, loaded at startup
- Literary system prompt that encodes 4 pipeline phases as default LLM behavior
- Scene files as markdown with narrative-beat-based IDs (`{beat-slug}-{sequence:02d}-{slug}.md`)
- Atomic file writes (write to `.tmp`, rename to target)
- Markov-guided beat suggestion tool (`suggest_next_beat`) wired to MarkovInferenceEngine
- Chapter deduction tool (`deduce_chapters`) that runs ChapterDeductor on all written scenes
- CLI entry point (one command to start writing)
- Pi SDK version pinned in `package.json`
- Pi's `SessionManager` for conversation persistence

### Must NOT Have (Guardrails)
- NO multi-agent orchestration (AgentRegistry, Mailbox, PipelineOrchestrator — Pi LLM is sole agent in V1)
- NO changes to `packages/kleptowriter-core/` (adapter imports, doesn't modify)
- NO additional LLM dependencies beyond Pi SDK (no openai, anthropic, langchain, vercel-ai-sdk, mastra)
- NO database dependencies (no SQLite, Postgres, Redis — file I/O only)
- NO web UI, dashboard, or GUI (CLI only)
- NO web search, external data sources, or research tools
- NO wiki management in V1
- NO deletion of existing 4 stub packages in this plan (add README deprecation note, separate cleanup)

---

## Verification Strategy

> ZERO HUMAN INTERVENTION — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: Bun test + `bun:test` in monorepo
- **Automated tests**: Tests-after (smoke tests + integration tests)
- **Smoke test first**: A dedicated task validates Pi SDK `createAgentSession()` with `noTools: "all"` + custom tool registration works before any other adapter code is written

### QA Policy
Every task includes agent-executed QA scenarios. Evidence to `.omo/evidence/task-{N}-{scenario}.{ext}`.
- **Pi SDK tests**: Bash scripts that start Pi session, send prompts, verify tool outputs
- **Data persistence tests**: Bash scripts that create data, exit, restart, verify data intact
- **Tool isolation tests**: Verify only Kleptowriter tools are registered (no coding tools)

---

## Execution Strategy

```
Wave 1a (Foundation scaffolding — parallel):
├── Task 1: Pi SDK smoke test (de-risks everything)
├── Task 2: Scaffold adapter-pi package

Wave 1b (Design — parallel, depends on 1a):
├── Task 3: Design custom tool signatures + TypeBox schemas
└── Task 4: Write literary system prompt

Wave 2a (Core tools — parallel, depends on 1b):
├── Task 5: Implement bible persistence + query/update tools (bible.json)
├── Task 6: Implement scene tools (write_scene, read_scene, list_scenes)
└── Task 7: Implement evaluation tool (evaluate_prose)

Wave 2b (Context + chapters — parallel, depends on 2a):
├── Task 8: Implement context tool (load_context) — needs 5, 6
└── Task 10: Implement chapter deduction tool (deduce_chapters) — needs 6

Wave 2c (Markov — depends on 2b):
└── Task 9: Implement Markov beat suggestion tool (suggest_next_beat) — needs 8

Wave 3 (Session integration — sequential):
├── Task 11: Build CLI entry point (createAgentSession config + tool registration + session startup)
├── Task 12: CLI runner with auth + workspace setup
└── Task 13: Example/quickstart novel writing workflow

Wave FINAL (4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA — novel writing session end-to-end (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 6 → Task 8 → Task 11 → Task 12 → Task 13 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 2a)
```

### Dependency Matrix
- **1**: - → 3, 4
- **2**: - → 3, 4
- **3**: 1, 2 → 5, 6, 7, 8, 9, 10
- **4**: 1, 2 → 5, 6, 7, 8, 9, 10
- **5**: 3, 4 → 8, 11
- **6**: 3, 4 → 11
- **7**: 3, 4 → 11
- **8**: 3, 4, 5, 6 → 11, 9
- **9**: 3, 4, 8 → 11
- **10**: 3, 4, 6 → 11
- **11**: 5, 6, 7, 8, 9, 10 → 12, 13
- **12**: 11 → 13
- **13**: 12 → F1-F4
- **F1-F4**: 13 → user

### Agent Dispatch Summary
- **Wave 1a**: **2 tasks** — T1 → `unspecified-high`, T2 → `quick`
- **Wave 1b**: **2 tasks** — T3 → `quick`, T4 → `writing`
- **Wave 2a**: **3 tasks** — T5 → `deep`, T6 → `deep`, T7 → `deep`
- **Wave 2b**: **2 tasks** — T8 → `deep`, T10 → `deep`
- **Wave 2c**: **1 task** — T9 → `deep`
- **Wave 3**: **3 tasks** — T11 → `deep`, T12 → `quick`, T13 → `writing`
- **FINAL**: **4 reviews** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Pi SDK Smoke Test

  **What to do**:
  - Write a standalone script (`packages/adapter-pi/smoke-test.ts`) that:
    1. Calls `createAgentSession()` with `noTools: "all"`
    2. Registers one minimal custom tool via `customTools`
    3. Sends a test prompt to verify the tool is callable
    4. Verifies no built-in Pi tools are listed in the session
    5. Prints session config (model, tools, system prompt source)
  - This script must pass before any other adapter code is written (de-risks the entire plan)
  - Pin the Pi SDK version used in the test

  **Must NOT do**:
  - No Kleptowriter data model code — pure Pi SDK validation
  - No workspace persistence

  **Recommended Agent Profile**: unspecified-high
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 1a (with Task 2)
  **Blocks**: 3, 4
  **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `bun run packages/adapter-pi/smoke-test.ts` exits 0
  - [ ] Output confirms: (a) Pi session created, (b) custom tool registered and callable, (c) zero built-in tools (no bash, read, write, edit)
  - [ ] Error output if Pi SDK is incompatible

  **QA Scenarios**:
  ```
  Scenario: Smoke test passes
    Tool: Bash
    Steps:
      1. cd /workspace/kleptowriter
      2. bun install (if needed)
      3. bun run packages/adapter-pi/smoke-test.ts
    Expected: Exit code 0, logs confirm Pi session + custom tool + no built-in tools
    Failure Indicators: Non-zero exit, built-in tools visible, custom tool not callable
    Evidence: .omo/evidence/task-01-smoke.log
  ```

- [x] 2. Scaffold adapter-pi Package

  **What to do**:
  - Create `packages/adapter-pi/` following monorepo convention
  - `package.json` with `name: "@kleptowriter/adapter-pi"`, `workspace:*` dep on `@kleptowriter/kleptowriter-core`, dep on `@earendil-works/pi-coding-agent` (pinned version from Task 1)
  - `tsconfig.json` extending root
  - `src/index.ts` as barrel export
  - `src/tools/` directory structure
  - `src/prompt/` directory for system prompt
  - `README.md` with status and description

  **Must NOT do**:
  - No real code in tools or prompt yet — just file structure
  - No modifications to existing packages

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 1a (with Tasks 1)
  **Blocks**: 3, 4
  **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` passes with zero errors for the new package
  - [ ] `bun run build` succeeds
  - [ ] Package structure mirrors other adapter packages

  **QA Scenarios**:
  ```
  Scenario: Package compiles
    Tool: Bash
    Steps: bun run typecheck
    Expected: Zero type errors
    Evidence: .omo/evidence/task-02-scaffold.log
  ```

- [x] 3. Design Custom Tool Signatures

  **What to do**:
  - Define TypeScript interfaces and TypeBox schemas for 7 core tools (write_scene, read_scene, list_scenes, query_bible, update_bible, evaluate_prose, load_context). Tools 8 (suggest_next_beat) and 9 (deduce_chapters) define their own schemas in Tasks 9 and 10.
    1. `write_scene` — Create/update scene file
       - Params: `sceneId: string`, `title: string`, `prose: string`, `metadata: { pov, characters[], locations[], chronology, tension, mood, plotThreads[], thematicMotifs[] }`
       - Returns: `{ ok: boolean, path: string, error?: string }`
    2. `read_scene` — Read scene by ID
       - Params: `sceneId: string`
       - Returns: `{ ok: boolean, scene?: SceneDocument, error?: string }`
    3. `list_scenes` — List all scenes
       - Params: `(none)` or `{ act?: string, chapter?: string }`
       - Returns: `{ scenes: Array<{ id, title, status, wordCount }> }`
    4. `query_bible` — Query story bible
       - Params: `{ type: "characters" | "locations" | "plotThreads", filter?: string }`
       - Returns: `{ results: object[] }`
    5. `update_bible` — Update story bible
       - Params: `{ type: "characters" | "locations" | "plotThreads", id: string, data: object }`
       - Returns: `{ ok: boolean, version: number }`
    6. `evaluate_prose` — Run scene evaluation
       - Params: `{ sceneId: string }`
       - Returns: `{ verdict: "pass" | "conditional" | "reject", report: object }`
    7. `load_context` — Load existing story state into LLM context
       - Params: `{ sceneCount?: number }` (default: 5)
       - Returns: `{ bible: object, recentScenes: object[] }`
  - Use `Type.Object({...})` from `typebox` for Pi tool schema compatibility
  - Write type definitions in `src/tools/types.ts`
  - Write Pi tool definitions (for `defineTool()`) in `src/tools/registry.ts`

  **Must NOT do**:
  - No implementation logic — just types, schemas, and empty tool stubs
  - No actual file I/O or LLM calls

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 1b (with Tasks 4)
  **Blocks**: 5, 6, 7, 8, 9, 10
  **Blocked By**: 1 (Pi SDK tool schema API confirmed by smoke test), 2 (package structure exists)

  **Acceptance Criteria**:
  - [ ] All 7 tool definitions typecheck with zero errors
  - [ ] Each tool has complete jsDoc describing behavior
  - [ ] Schema compatibility confirmed with Pi's `defineTool()`

  **QA Scenarios**:
  ```
  Scenario: Tool types compile
    Tool: Bash
    Steps: bun run typecheck --filter @kleptowriter/adapter-pi
    Expected: Zero type errors
    Evidence: .omo/evidence/task-03-tool-types.log
  ```

- [x] 4. Write Literary System Prompt

  **What to do**:
  - Write `src/prompt/system.md` — the full literary writing system prompt
  - Must establish AI's role as a literary writing assistant/narrative architect
  - Must encode Kleptowriter's 4 pipeline phases as default behavior:
    - **Material Ingestion**: On first interaction, ask about story premise, genre, tone, key characters, setting
    - **Interview**: Probe deeper for character motivations, thematic questions, dramatic tension, plot threads
    - **Scene Loop**: Default writing mode. For each scene: plan (what happens, POV, purpose) → use write_scene → optionally use evaluate_prose → revise based on feedback
    - **Revision**: After several scenes, review consistency, character arcs, pacing
  - Must describe each of the 9 tools, when to use them, and their parameters
  - Must define scene naming convention: `{beat-slug}-{sequence:02d}-{slug}.md` (narrative beat/phase → sequence → scene slug, e.g. `rising-action-03-library-race.md`). Explain that beats come from the story structure template (setup, inciting-incident, rising-action, climax, falling-action, resolution) and act/chapter numbers are deduced retroactively.
  - Must instruct the LLM to use `load_context` at session start to resume existing work
  - Must describe the story bible concept (characters, locations, plot threads)
  - Tone: literary, nuanced, sophisticated. Not "coding assistant." Not overly prescriptive.
  - Target length: 1500-2500 words (Pi's system prompt has no hard length limit)

  **Must NOT do**:
  - No coding instructions or tool biases
  - No multi-agent terminology (don't reference "writer agent", "critic agent" — the LLM is all roles)
  - No pipeline implementation details (don't reference `PipelinePhase` enum or internal APIs)

  **Recommended Agent Profile**: writing
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 1b (with Tasks 3)
  **Blocks**: 5, 6, 7, 8, 9, 10
  **Blocked By**: 1 (Pi SDK system prompt API confirmed), 2 (package directory exists)

  **Acceptance Criteria**:
  - [ ] Prompt file exists at `packages/adapter-pi/src/prompt/system.md`
  - [ ] All 4 pipeline phases described as default workflow
   - [ ] All 9 tools described with usage guidance
  - [ ] Scene naming convention documented
  - [ ] No coding terminology or tool bias present
  - [ ] Readable as standalone instruction set (passes the "could a novelist understand this?" test)

  **QA Scenarios**:
  ```
  Scenario: Prompt is valid markdown
    Tool: Bash
    Steps: head -5 packages/adapter-pi/src/prompt/system.md
    Expected: First line is "# " or similar valid markdown header
    Evidence: .omo/evidence/task-04-prompt-validity.log

  Scenario: No coding terms
    Tool: Bash
    Steps: grep -ci 'bash\|read\|write\|edit\|grep\|find\|ls\|function\|variable\|compile\|deploy' packages/adapter-pi/src/prompt/system.md
    Expected: Count < 3 (only in tool descriptions)
    Evidence: .omo/evidence/task-04-prompt-nocode.log
  ```

- [x] 5. Implement Bible Persistence + Query Tools

  **What to do**:
  - Create `src/bible/persistence.ts` with:
    - `loadBible(path: string): InMemoryStoryBible` — read `bible.json`, populate `InMemoryStoryBible`
    - `saveBible(bible: InMemoryStoryBible, path: string): void` — serialize to `bible.json` atomically
    - `storyDir: string` — default to `./story/` (configurable)
    - `biblePath: string` — default to `./story/bible.json`
  - Atomic writes: write to `.bible.json.tmp`, then `rename` to `bible.json`
  - Serialization: extract characters, locations, plot threads, arcs, knowledge graph as plain JSON
  - Deserialization: reconstruct all InMemoryStoryBible maps and state
  - Handle empty/missing bible file (first run) — return empty InMemoryStoryBible
  - Handle corrupted bible file — log warning, return empty InMemoryStoryBible (don't crash)
  - Implement 2 Pi tool definitions in `src/tools/bible-tools.ts`:
    1. **query_bible**: Query story bible by type (characters/locations/plotThreads) with optional filter. Use persistence layer to load current bible state, extract by type, apply filter.
    2. **update_bible**: Update story bible entry by type + ID. Load current bible, apply mutation via core's API, persist, return new version number.
  - Both tools use `defineTool()` with TypeBox schemas from Task 3
  - Both tools return Pi-compatible `{ content: [...], details: {} }` format

  **Must NOT do**:
  - No database, no SQL, no additional dependencies
  - No modification to core's InMemoryStoryBible class

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2a (with Tasks 6, 7)
  **Blocks**: 8, 11
  **Blocked By**: 3 (tool types), 4 (system prompt)

  **Acceptance Criteria**:
  - [ ] Roundtrip: create bible, add character, save, load → character exists
  - [ ] Bible version increments on each save
  - [ ] Atomic write: kill during write → no corrupted bible.json (only .tmp file)
  - [ ] Empty file on first run → empty bible, not crash
  - [ ] Corrupted JSON → warning logged, empty bible returned

  **QA Scenarios**:
  ```
  Scenario: Bible roundtrip
    Tool: Bash
    Steps:
      1. bun -e 'const { saveBible, loadBible } = require("./src/bible/persistence"); ...'
      2. save bible with character "Ada"
      3. load bible → assert character "Ada" present
    Expected: Character roundtrips correctly
    Evidence: .omo/evidence/task-05-roundtrip.log

  Scenario: Corrupted bible recovery
    Tool: Bash
    Steps:
      1. Write invalid JSON to bible.json
      2. loadBible() → assert no crash, empty bible returned
    Expected: Graceful recovery
    Evidence: .omo/evidence/task-05-corruption.log
  ```

- [x] 6. Implement Scene Tools

  **What to do**:
  - Create 3 Pi tool definitions in `src/tools/scene-tools.ts`:
    1. **write_scene**: 
       - Call `writeScene()` from kleptowriter-core with the semantic scene ID
       - Update SceneDatastore after write
       - Return path and success status
       - Atomic write via core's existing writeScene (verify it handles this)
    2. **read_scene**:
       - Call `readScene()` from kleptowriter-core by scene ID
       - Return full scene document
    3. **list_scenes**:
       - Scan `story/scenes/*.md` directory
       - Parse frontmatter to extract ID, title, status, word count
       - Optionally filter by act/chapter prefix
       - Return sorted array
  - Each tool uses `defineTool()` with TypeBox schemas from Task 3
  - Each tool returns Pi-compatible `{ content: [...], details: {} }` format

  **Must NOT do**:
  - No multi-agent orchestration
  - No chapter deduction
  - No wiki management

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2a (with Tasks 5, 7)
  **Blocks**: 8, 10, 11
  **Blocked By**: 3 (tool types), 4 (system prompt)

  **Acceptance Criteria**:
  - [ ] write_scene creates valid markdown scene file with correct frontmatter
  - [ ] read_scene returns the same data that was written
  - [ ] list_scenes returns all scenes in directory, sorted by ID
   - [ ] Scene file uses semantic naming: `{beat-slug}-{sequence:02d}-{slug}.md`

  **QA Scenarios**:
  ```
  Scenario: Write and read scene
    Tool: Bash
    Steps:
      1. Call write_scene with scene data
      2. Verify file exists at correct path
      3. Call read_scene → assert title and prose match
    Expected: Full roundtrip
    Evidence: .omo/evidence/task-06-scene-roundtrip.log

  Scenario: List scenes
    Tool: Bash
    Steps:
      1. Write 3 scenes with different act/chapter patterns
      2. list_scenes() → assert all 3 returned, sorted correctly
    Expected: 3 scenes, ordered by ID
    Evidence: .omo/evidence/task-06-list.log
  ```

- [x] 7. Implement Evaluation Tool

  **What to do**:
  - Create 1 Pi tool definition in `src/tools/eval-tools.ts`:
    1. **evaluate_prose**:
       - Read scene by ID
       - Run `SceneExtractor.extract()` to extract metadata
       - Run `SceneProseGate.evaluate()` to evaluate scene quality
       - Collect notes via `NoteCollector`
       - Return structured evaluation report: verdict, score, findings[]
  - The evaluation should be informative for the LLM to self-improve
  - Return both machine-readable verdict and human-readable summary

  **Must NOT do**:
  - No auto-revision (the LLM decides what to do with feedback)
  - No multi-agent evaluator orchestration

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2a (with Tasks 5, 6)
  **Blocks**: 11
  **Blocked By**: 3 (tool types), 4 (system prompt)

  **Acceptance Criteria**:
  - [ ] evaluate_prose on a valid scene returns verdict + report
  - [ ] evaluate_prose on a nonexistent scene returns error
  - [ ] Report includes: extraction metadata + prose gate result + notes

  **QA Scenarios**:
  ```
  Scenario: Evaluate existing scene
    Tool: Bash
    Steps:
      1. Write a test scene (e.g., setup-01-test-scene.md)
      2. Call evaluate_prose("setup-01-test-scene")
      3. Assert verdict is one of "pass" | "conditional" | "reject"
    Expected: Evaluated successfully
    Evidence: .omo/evidence/task-07-evaluate.log
  ```

- [x] 8. Implement load_context Tool

  **What to do**:
  - Create 1 Pi tool definition in `src/tools/context-tools.ts`:
    1. **load_context**:
       - Load bible from `bible.json` via persistence module
       - Load last N scene files (default: 5)
       - For each scene, read full content via `readScene()`
       - For older scenes beyond N, load condensed summaries only
       - Return: `{ bible: { characters, locations, plotThreads, arcs }, recentScenes: SceneDocument[], summary: string }`
  - The return value forms the context the LLM receives — it's a single large tool result
  - This tool is called automatically at session start (configured in CLI entry point)

  **Must NOT do**:
  - No TieredMemory integration (out of scope for V1)
  - No discourse-level summarization (just list N recent scenes)

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2b (with Tasks 10)
  **Blocks**: 9, 11
  **Blocked By**: 3 (tool types), 4 (system prompt), 5 (bible persistence), 6 (scene tools)

  **Acceptance Criteria**:
  - [ ] load_context returns bible + last N scenes on first call
  - [ ] load_context with empty workspace returns empty bible + empty scenes (no crash)
  - [ ] load_context on session resume returns previously written data

  **QA Scenarios**:
  ```
  Scenario: Load context with existing data
    Tool: Bash
    Steps:
      1. Write a scene + save bible with character
      2. Call load_context()
      3. Assert bible has character, recentScenes has 1 scene
    Expected: Context loaded correctly
    Evidence: .omo/evidence/task-08-load.log
  ```

- [x] 9. Implement Markov Beat Suggestion Tool

  **What to do**:
  - Create 1 Pi tool definition in `src/tools/markov-tools.ts`:
    1. **suggest_next_beat**:
       - Import `MarkovInferenceEngine` from kleptowriter-core
       - Load a `NarrativeStructure` (via `templateRegistry.getStructure()`) and extract `Transition[]` from `structure.beats[].transitions` to train the Markov engine
       - Scan existing scene files to determine current narrative state (which beats have been written)
       - Call `engine.predictNext(currentState, markovTemplate)` to predict likely next narrative beat
       - Return: `{ suggestions: Array<{ beat: string, probability: number, description: string }>, currentBeat: string, template: string }`
  - The Markov engine uses existing narrative templates from core — no new template definitions needed
  - The tool is informational — the LLM decides whether to follow the suggestion
  - Wire system prompt to reference Markov suggestions during the SceneLoop phase

  **Must NOT do**:
  - No modification to core's MarkovInferenceEngine or MarkovTemplate
  - No automatic scene generation — the LLM decides what to write

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2c (alone — needs Task 8 from Wave 2b)
  **Blocks**: 11
  **Blocked By**: 3 (tool types), 4 (system prompt), 8 (load_context — for current state detection)

  **Acceptance Criteria**:
  - [ ] suggest_next_beat with 2 written scenes returns suggestions with non-zero probabilities
  - [ ] suggest_next_beat with empty workspace returns the first beat from the template
  - [ ] Output includes beat name, probability, and human-readable description

  **QA Scenarios**:
  ```
  Scenario: Suggest next beat with existing scenes
    Tool: Bash
    Steps:
      1. Write 2 scenes with different beats (e.g., setup-01-intro.md, setup-02-worldbuilding.md)
      2. Call suggest_next_beat()
      3. Assert suggestions contains at least one beat with probability > 0
    Expected: Markov predicts next beat based on written scenes
    Evidence: .omo/evidence/task-09-markov.log

  Scenario: Empty workspace
    Tool: Bash
    Steps:
      1. Call suggest_next_beat() with empty story directory
      2. Assert first suggestion is the initial narrative beat (e.g., "setup")
    Expected: Returns starting beat from template
    Evidence: .omo/evidence/task-09-markov-empty.log
  ```

- [x] 10. Implement Chapter Deduction Tool

  **What to do**:
  - Create 1 Pi tool definition in `src/tools/chapter-tools.ts`:
    1. **deduce_chapters**:
       - Scan all written scene files and extract their narrative beats
       - Import `ChapterDeductor` from kleptowriter-core
       - Run `ChapterDeductor.deduce()` grouping scenes into chapters based on narrative structure, pacing, and beat clustering
       - Return: `{ chapters: Array<{ chapterNumber: number, title: string, scenes: string[], summary: string }>, actBreakdown?: Array<{ act: string, chapters: number[] }> }`
  - The tool is designed to be called periodically (e.g., after every 3-5 scenes) or at the end
  - Return human-readable chapter structure the LLM can use for revision decisions
  - Store chapter deduction results to `story/chapters.yaml` for persistence

  **Must NOT do**:
  - No modification to core's ChapterDeductor
  - No automatic chapter restructuring — the LLM approves changes

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 2b (with Tasks 8)
  **Blocks**: 11
  **Blocked By**: 3 (tool types), 4 (system prompt), 6 (scene tools — reads scene files)

  **Acceptance Criteria**:
  - [ ] deduce_chapters with 5+ scenes returns chapter groupings with summaries
  - [ ] deduce_chapters with 1 scene returns a single chapter with that scene
  - [ ] Chapters.yaml is written to `story/chapters.yaml`
  - [ ] Re-running deduce_chapters returns consistent results (no drift)

  **QA Scenarios**:
  ```
  Scenario: Chapter deduction with multiple scenes
    Tool: Bash
    Steps:
      1. Write 6 scenes across different narrative beats
      2. Call deduce_chapters()
      3. Assert chapters are returned with scene groupings
      4. Assert story/chapters.yaml exists
    Expected: Scenes grouped into logical chapters
    Evidence: .omo/evidence/task-10-chapters.log
  ```

- [x] 11. Build CLI Entry Point

  **What to do**:
  - Create `src/index.ts` with:
    - `createKleptowriterSession()` — factory that configures and starts Pi session:
       1. Create `AuthStorage` + `ModelRegistry`
       2. Create `DefaultResourceLoader` with `systemPromptOverride` loading `system.md`
       3. Configure Pi session: `noTools: "all"`, `customTools: [...]` (all 9 tools from Tasks 5-10)
       4. Set `SessionManager` for persistence
       5. Call `createAgentSession()` with configuration
       6. Subscribe to Pi events for streaming output
       7. Auto-call `load_context` immediately after session start
     - `startNovelSession()` — convenience that:
       1. Calls `createKleptowriterSession()`
       2. Sends initial greeting / pipeline phase prompt
       3. Returns the session (caller handles event loop)
  - Default model: try Claude Sonnet 4 first, fall back to first available
  - Default provider: Anthropic (API key from `ANTHROPIC_API_KEY` env var)

  **Must NOT do**:
  - No custom TUI code — use Pi's built-in streaming (interactive mode or print mode)
  - No multi-session management — single session per run

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: NO (integration task)
  **Blocks**: 12, 13
  **Blocked By**: 5, 6, 7, 8, 9, 10 (all tool implementations)

  **Acceptance Criteria**:
  - [ ] `createKleptowriterSession()` returns a valid Pi `AgentSession`
  - [ ] Session has 9 custom tools in `agent.state.tools`
  - [ ] Session has zero built-in tools
  - [ ] System prompt is loaded from `system.md`
  - [ ] `load_context` is called automatically at startup
  - [ ] Session can accept prompts and return streaming responses

  **QA Scenarios**:
  ```
  Scenario: Session initializes correctly
    Tool: Bash
    Steps:
      1. Create session with test config
      2. Assert session.agent.state.tools has 9 tools
      3. Assert no tool name matches "bash|read|write|edit|grep|find|ls"
    Expected: 9 Kleptowriter tools, 0 coding tools
    Evidence: .omo/evidence/task-11-session-tools.log
  ```

- [x] 12. CLI Runner Script

  **What to do**:
  - Create `src/cli.ts` — the entry point for `bun run start`
  - Parse environment: `ANTHROPIC_API_KEY` (or other provider), working directory
  - Set up workspace: create `story/scenes/` directory if not exists
  - Call `startNovelSession()` from Task 11
  - Handle:
    - Ctrl+C → graceful shutdown (save bible, persist session)
    - Error recovery (retry on transient failure)
    - Session persistence path (default: `story/.pi-session/`)
  - Add `package.json` `"scripts"` entry: `"start": "bun run src/cli.ts"`
  - Add `"bin"` entry for future global install: `"kleptowriter": "./src/cli.ts"`

  **Must NOT do**:
  - No CLI framework (commander, yargs, etc.) — bare bones is fine
  - No daemon mode, no watch mode, no hot reload

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: NO
  **Blocks**: 13
  **Blocked By**: 11

  **Acceptance Criteria**:
  - [ ] `bun run start` initializes Pi session and shows welcome message
  - [ ] Ctrl+C exits cleanly (no hanging processes, no corrupted files)
  - [ ] Missing API key produces clear error message
  - [ ] `story/scenes/` directory created if not exists

  **QA Scenarios**:
  ```
  Scenario: CLI starts and shows welcome
    Tool: Bash (with timeout+tmux for interactive)
    Steps:
      1. ANTHROPIC_API_KEY="test" bun run start
      2. Wait 10s for initialization
      3. Assert welcome/output visible (capture first 20 lines of stdout)
    Expected: Session starts, no crash
    Evidence: .omo/evidence/task-12-cli-start.log
  ```

- [x] 13. Example + Quickstart

  **What to do**:
  - Create `examples/novel-session/` with:
    - `README.md` — "Start Writing Your Novel in 5 Minutes"
    - `story/scenes/` — pre-created example workspace (or instructions)
    - `.env.example` — template for API key
    - `run.sh` — one-liner to start (or just `bun run start`)
  - Write README for `packages/adapter-pi/`:
    - Prerequisites (Pi SDK, API key)
    - Quick start: `bun run start`
    - What to expect (story setup → interview → scene writing → revision)
    - Example prompts to try
    - How scene files, bible, Markov beat suggestions, and chapter deduction work
    - How to resume a session

  **Must NOT do**:
  - No tutorials, no video, no blog post
  - No example novel content (empty workspace)

  **Recommended Agent Profile**: writing
  **Can Run In Parallel**: NO
  **Blocks**: F1-F4
  **Blocked By**: 11, 12

  **Acceptance Criteria**:
  - [ ] README is complete and accurate
  - [ ] `bun run start` works from a clean checkout following README instructions
  - [ ] Example prompts produce expected behavior

  **Evidence**: `.omo/evidence/task-13-readme.log`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.omo/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run the build, lint, and test commands from the plan's "Success Criteria" section. Review all changed files for: type suppression, empty catches, debug logging in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute end-to-end novel writing session: write a scene, query bible, evaluate prose, persist, restart, verify context loaded correctly. Capture evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(adapter-pi): scaffold package + smoke test + tool schemas + system prompt`
- **Wave 2**: `feat(adapter-pi): bible persistence + scene tools + evaluation + context + Markov + chapter deduction`
- **Wave 3**: `feat(adapter-pi): CLI entry point + runner + quickstart docs`

---

## Success Criteria

### Verification Commands
```bash
cd /workspace/kleptowriter

# Typecheck all packages
bun run typecheck

# Build
bun run build

# Adapter-specific build
bun run --filter @kleptowriter/adapter-pi build

# Smoke test
bun run packages/adapter-pi/smoke-test.ts

# Run the novel writing harness
ANTHROPIC_API_KEY=sk-... bun run --filter @kleptowriter/adapter-pi start
```

### Final Checklist
- [ ] Pi SDK smoke test passes (noTools + custom tools work)
- [ ] All 9 tools registered, zero coding tools present
- [ ] Bible.json roundtrip (create → save → load → data intact)
- [ ] Scene file roundtrip with semantic naming (narrative-beat-based IDs)
- [ ] evaluate_prose returns structured feedback
- [ ] load_context restores story state on resume
- [ ] suggest_next_beat predicts next narrative beat from Markov engine
- [ ] deduce_chapters groups scenes into chapters with summaries
- [ ] CLI starts with literary system prompt
- [ ] Ctrl+C exits cleanly
- [ ] README documents novel writing workflow (beats, Markov, chapter deduction)
- [ ] No modifications to kleptowriter-core
- [ ] No additional LLM dependencies beyond Pi SDK
