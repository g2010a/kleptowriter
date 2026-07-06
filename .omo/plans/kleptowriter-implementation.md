# Kleptowriter — Implementation Plan

## TL;DR

> **Quick Summary**: Build the Kleptowriter literary writing agent system from the architecture blueprint at `.omo/plans/literary-writing-agent-system.md`. Harness-agnostic TypeScript library with 17 agents, Markov chain + constraint narrative structure, hard-gated pipeline, mailbox protocol, and wiki-as-truth knowledge model.
>
> **Deliverables**:
> - Core TypeScript library (`packages/kleptowriter-core/`)
> - Story data model (scene files, wiki, chapter assembly, in-memory Bible)
> - 17 agent interfaces with capability tiers
> - Markov chain + constraint inference engine
> - Pipeline orchestrator with dual gates (plan gate + prose gate)
> - Mailbox communication protocol
> - Story wiki (LLM-maintained, Karpathy-style)
> - 12 narrative structure plugin templates
> - Harness adapter interfaces (OpenCode, Codex, Claude Code, Standalone)
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 8 waves + final verification
> **Critical Path**: Wave 0 (project setup) → Wave 1 (data model) → Wave 3 (agent system) → Wave 4 (Markov) → Wave 5 (pipeline) → final verification

---

## Context

### Source Blueprint
`.omo/plans/literary-writing-agent-system.md` (v1.5, 2623 lines) defines all interfaces, data models, agent contracts, pipeline design, and adapter surfaces.

### Key Design Decisions
- **Scenes are flat atoms**: `story/scenes/scene-001.md`. No act/chapter hierarchy. Chapters are `chapters.yaml` referencing scene IDs.
- **Wiki is truth, Bible is cache**: Wiki on disk (markdown + YAML frontmatter) is single durable source. Bible is in-memory cache populated from wiki.
- **Markov + constraints**: Position-based beats replaced by transition probabilities + 5 constraint types.
- **Dual gates**: Scene Plan Gate (cheap, no prose) → Writer writes → Prose Gate (expensive).
- **Chapters deduced retroactively**: ChapterDeductor scans for natural breaks.
- **yWriter7 patterns**: Scene status (0-4), soft deletion, word count, custom fields.
- **Harness-agnostic**: Core has no harness dependencies. Adapters are separate packages.

### Target Directory
This plan deploys to `/workspace/kleptowriter/`. All file paths below are relative to that root.

---

## Work Objectives

### Core Objective
Build the complete Kleptowriter literary writing agent system from the architecture blueprint.

### Concrete Deliverables
- `packages/kleptowriter-core/` — full TypeScript library
- 4 adapter packages (interfaces stubbed, implementation-ready)
- Test suite for core logic
- Example project with wiki, scenes, and chapter assembly

### Must Have
- All TypeScript interfaces from the blueprint implemented
- Scene file format (YAML frontmatter + markdown) with reader/writer
- Wiki page format with YAML frontmatter parser
- In-memory StoryBible cache with wiki→Bible population
- Chapter assembly (chapters.yaml reader + ChapterDeductor)
- 17 agent interfaces with mailbox protocol
- MarkovInferenceEngine with Monte Carlo simulation
- 5 constraint types enforced
- Pipeline orchestrator with Scene Plan Gate and Prose Gate
- 12 narrative structure templates as YAML files
- Context management (sliding window, tiered memory, checkpoint)
- Harness adapter interfaces

### Must NOT Have
- No GUI/UI layer in core
- No real LLM API calls — model tier abstractions only
- No harness plugin code in core — adapters are separate packages
- No runtime agent orchestration runtime — agents are interfaces, orchestrator is the runtime
- No web server or database dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure**: Bun test + `bun:test`
- **Automated tests**: TDD — RED (failing test) → GREEN (minimal impl) → REFACTOR
- **Coverage target**: ≥90% core logic, ≥70% adapters

### QA Policy
Every task uses Bash (Bun REPL) to import functions, call with test data, assert outputs. Evidence to `.omo/evidence/task-{N}-{scenario}.{ext}`.

---

## Execution Strategy

```
Wave 0 (Foundation — project scaffolding + data types):
├── Task 1: Initialize package structure
├── Task 2: Core types & enums
├── Task 3: StoryBible interfaces
├── Task 4: Scene file format reader/writer
├── Task 5: Wiki page format + parser
└── Task 6: Chapter assembly + chapters.yaml reader

Wave 1 (Wiki + Bible — knowledge layer):
├── Task 7: WikiDirectory interface + page scanner
├── Task 8: StoryBible in-memory cache
├── Task 9: Wiki → Bible population engine
├── Task 10: raw-inputs scanner + Archivist
├── Task 11: KnowledgeGraph
├── Task 12: DramaticQuestion + PlotThread tracking
└── Task 13: ArcTracker + ThematicProgression

Wave 2 (Agent system):
├── Task 14: LiteraryAgent base + AgentRole
├── Task 15: Mailbox protocol (messages, routing)
├── Task 16: AgentRegistry
├── Task 17: Writer + Editor + Critic interfaces
├── Task 18: 8 evaluator agent interfaces
├── Task 19: Ideator + Researcher + FactChecker
├── Task 20: Narrative Consistency + Localizer
└── Task 21: Archivist interface

Wave 3 (Markov + constraints):
├── Task 22: MarkovInferenceEngine (variable-order, Monte Carlo)
├── Task 23: 5 constraint types
├── Task 24: ConstraintChecker
├── Task 25: ScenePlanner
├── Task 26: ScenePlan types
├── Task 27: 12 narrative structure YAML templates
├── Task 28: MarkovStructureGuidance
└── Task 29: MarkovPathPredictor

Wave 4 (Pipeline — orchestration + gates):
├── Task 30: PipelineOrchestrator
├── Task 31: InterviewProtocol
├── Task 32: ScenePlanGate
├── Task 33: SceneProseGate
├── Task 34: ChapterDeductor
├── Task 35: BibleUpdateProtocol
├── Task 36: IterationBudget
└── Task 37: ConflictResolution

Wave 5 (Evaluation — scene extraction):
├── Task 38: SceneExtractor
├── Task 39: MetadataDiff
├── Task 40: SceneDatastore
├── Task 41: CrossAgentQueries
├── Task 42: EvaluationReport types
└── Task 43: AgentNote collection

Wave 6 (Context management):
├── Task 44: SlidingWindowManager
├── Task 45: CondensationStrategy
├── Task 46: TieredMemory
├── Task 47: CheckpointManager
└── Task 48: ContextWindowBudget

Wave 7 (Adapters):
├── Task 49: HarnessAdapter base interface
├── Task 50: OpenCode adapter
├── Task 51: Codex adapter
├── Task 52: Claude Code adapter
└── Task 53: Standalone CLI adapter

Wave FINAL:
├── Task F1: Integration tests (end-to-end)
├── Task F2: Example project
├── Task F3: README + docs
└── Task F4: Build + typecheck + test pass
```

---

## TODOs

- [x] 1. Initialize Package Structure

  **What to do**:
  - Create `/workspace/kleptowriter/` with `package.json` (Bun), `tsconfig.json`, `bunfig.toml`
  - Set up monorepo structure: `packages/kleptowriter-core/`, `packages/adapter-opencode/`, etc.
  - Configure `bun test`, `bun run build`, `bun run typecheck` scripts
  - Add `packages/kleptowriter-core/src/index.ts` barrel export
  - Create `packages/kleptowriter-core/src/types/` directory structure

  **Must NOT do**:
  - No external dependencies beyond `bun-types`
  - No harness-specific code in core

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: NO (foundation task)
  **Blocks**: 2-6
  **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] `cd /workspace/kleptowriter && bun run build` succeeds
  - [ ] `cd /workspace/kleptowriter && bun run typecheck` succeeds with zero errors
  - [ ] `cd /workspace/kleptowriter && bun test` runs (even if 0 tests)
  - [ ] Directory structure matches the plan

  **QA Scenarios**:
  ```
  Scenario: Build passes
    Tool: Bash
    Steps:
      1. cd /workspace/kleptowriter
      2. bun install
      3. bun run build
    Expected: Exit code 0, dist/ generated
    Evidence: .omo/evidence/task-01-build.log

  Scenario: Typecheck passes
    Tool: Bash
    Steps: bun run typecheck
    Expected: Zero type errors
    Evidence: .omo/evidence/task-01-typecheck.log
  ```

- [x] 2. Core Types & Enums

  **What to do**:
  - Define `SceneStatus` enum (0=Outline, 1=Rough, 2=Draft, 3=Revised, 4=Done)
  - Define `AgentRole` enum (Writer, Editor, Critic, Ideator, Researcher, FactChecker, Localizer, Narratologist, PacingAnalyst, CharacterConsistency, ThematicCoherence, Worldbuilding, Dialogist, Stylesheet, MoodTensionCurator, NarrativeConsistency, Archivist)
  - Define `CapabilityTier` type (`"prose-gen" | "analysis" | "research" | "creativity" | ...`)
  - Define `SceneStatus`, `SceneId` (string), `ChapterId` (string), `CharacterId` (string)
  - Define `EvaluationVerdict` and `GateResult` types
  - Define `ConflictResolutionTier` enum

  **Must NOT do**: No complex logic, just type definitions

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 0 (with 3-6)
  **Blocks**: 14-21 (agent interfaces)
  **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] All enums compile with zero errors
  - [ ] TypeScript `strict` mode passes
  - [ ] Types used correctly when imported

  **QA Scenarios**:
  ```
  Scenario: Types compile
    Tool: Bash
    Steps: echo 'import { SceneStatus } from "./src/types/enums"; console.log(SceneStatus.Done)' > /tmp/test-types.ts && bun run /tmp/test-types.ts
    Expected: Prints 4
    Evidence: .omo/evidence/task-02-types.log
  ```

- [x] 3. StoryBible Interfaces

  **What to do**:
  - Implement `StoryBible` interface from blueprint §1.4: `characters`, `locations`, `items`, `chronology`, `arcs`, `plotThreads`, `dramaticQuestions`, `knowledgeState`, `thematicProgression`
  - Implement `CharacterState`, `LocationState`, `ItemState`, `TimelineEntry`
  - Implement `ArcTracker`, `PlotThread`, `DramaticQuestion`
  - Implement `KnowledgeGraph` with `knows()` query method
  - Implement `ThematicProgression`
  - All files in `packages/kleptowriter-core/src/data-model/bible/`

  **Must NOT do**: No persistence logic — interfaces only

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 0 (with 2, 4-6)
  **Blocks**: 7-13 (Bible cache), 14-21 (agent interfaces)
  **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] All interfaces defined with proper TypeScript types
  - [ ] `StoryBible` includes all required entity maps
  - [ ] `KnowledgeGraph.knows()` compiles with correct signature

  **QA Scenarios**:
  ```
  Scenario: Interfaces compile
    Tool: Bash
    Steps: echo 'import { StoryBible } from "./src/data-model/bible"; const b: StoryBible = {} as StoryBible; console.log("OK");' | bun run
    Expected: Compiles, prints OK
    Evidence: .omo/evidence/task-03-interfaces.log
  ```

- [x] 4. Scene File Format Reader/Writer

  **What to do**:
  - Implement scene file parsing: read YAML frontmatter + markdown body from `scene-001.md`
  - Implement scene file writing: serialize `SceneDocument` to markdown file
  - Define `SceneDocument` interface: `{ id, title, status, metadata, prose, customFields, unused? }`
  - Implement `SceneMetadata` with `pov`, `characters`, `locations`, `chronology`, `tension`, `mood`, `plotThreads`, `thematicMotifs`, `dramaticQuestions`
  - Handle YAML parsing with error recovery (graceful fallback for malformed frontmatter)
  - File in `packages/kleptowriter-core/src/data-model/scene/`

  **Must NOT do**: No chapter/act awareness — scenes are independent

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 0
  **Blocks**: 7-13, 22-29
  **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] Roundtrip: write → read produces identical data
  - [ ] Malformed frontmatter produces typed error, not crash
  - [ ] Handles empty body, missing frontmatter sections

  **QA Scenarios**:
  ```
  Scenario: Roundtrip scene file
    Tool: Bash
    Steps:
      1. bun run ts-eval 'writeScene("/tmp/test-scene.md", testScene)'
      2. bun run ts-eval 'const s = readScene("/tmp/test-scene.md"); assert(s.id === "scene-001")'
    Expected: Data identical
    Evidence: .omo/evidence/task-04-roundtrip.log
  ```

- [x] 5. Wiki Page Format + Parser

  **What to do**:
  - Define `WikiPage` interface: `{ type, name, aliases, tags, relatedPages, frontmatter, body }`
  - Define `WikiPageType` enum: character, location, concept, plot, research, scene
  - Implement parser: extract YAML frontmatter + markdown body from `story/wiki/**/*.md`
  - Implement `WikiLinkExtractor`: find `[[page-name]]` links in body, resolve to page IDs
  - Implement `WikiIndexEntry` for `index.md` generation
  - File in `packages/kleptowriter-core/src/wiki/`

  **Must NOT do**: No wiki→Bible extraction yet (that's Task 9)

  **Recommended Agent Profile**: deep
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 0
  **Blocks**: 7, 9
  **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] Parser extracts correct frontmatter fields from sample wiki page
  - [ ] `[[link]]` extraction finds all links in sample body
  - [ ] Graceful handling of pages without frontmatter

  **QA Scenarios**:
  ```
  Scenario: Parse wiki page
    Tool: Bash
    Steps:
      1. Write sample wiki page with frontmatter
      2. run parser
      3. assert extracted fields match input
    Expected: All frontmatter fields + body extracted correctly
    Evidence: .omo/evidence/task-05-parse.log
  ```

- [x] 6. Chapter Assembly + chapters.yaml Reader

  **What to do**:
  - Define `ChapterAssembly` interface: `{ id, title, description, sortOrder, scenes[], type }`
  - Define `ChapterCandidate` and `ChapterEdit` interfaces for the ChapterDeductor
  - Implement `chapters.yaml` reader (parse YAML into `ChapterAssembly[]`)
  - Implement `chapters.yaml` writer (serialize back)
  - File in `packages/kleptowriter-core/src/data-model/chapter/`

  **Must NOT do**: No chapter deduction logic (that's Task 34)

  **Recommended Agent Profile**: quick
  **Can Run In Parallel**: YES
  **Parallel Group**: Wave 0
  **Blocks**: 34
  **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] Roundtrip: write → read chapters.yaml produces identical data
  - [ ] Empty scenes array (placeholder chapters) handled correctly

  **QA Scenarios**:
  ```
  Scenario: Read chapters.yaml
    Tool: Bash
    Steps:
      1. Write sample chapters.yaml
      2. readChapters("/tmp/chapters.yaml")
      3. assert result[0].scenes includes "scene-001"
    Expected: Scene IDs match input
    Evidence: .omo/evidence/task-06-chapters.log
  ```

- [x] 7. WikiDirectory Interface + Page Scanner

  **What to do**:
  - Implement `WikiDirectory` interface: scan `story/wiki/` tree, catalog all pages by type
  - Implement page indexing: build `index.md` from page catalog
  - Implement `log.md` append (add entry on each wiki change)
  - Implement `resolveWikiLink(link: string): WikiPage`
  - Handle orphaned links (links with no target page)
  - File in `packages/kleptowriter-core/src/wiki/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1 (with 8-13)
  **Blocks**: 9
  **Blocked By**: 5

  **Acceptance Criteria**:
  - Scan discovers all wiki pages in test directory
  - `index.md` lists all pages; `resolveWikiLink` valid; orphaned links warned

  **QA Scenarios**:
  ```
  Scenario: Scan discovers pages
    Tool: Bash
    Steps: scan test wiki dir with 5 pages → assert all found
    Expected: 5 pages found
    Evidence: .omo/evidence/task-07-scan.log
  ```

- [x] 8. StoryBible In-Memory Cache

  **What to do**:
  - Implement `InMemoryStoryBible implements StoryBible`
  - Version tracking, `applyStateUpdate`, entity getters, `queryCharacters`
  - File in `packages/kleptowriter-core/src/data-model/bible/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1
  **Blocks**: 9, 35
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Version increments on update; get/query return correct data

  **QA Scenarios**:
  ```
  Scenario: Cache operations
    Tool: Bash
    Steps: create cache, add char, query → assert found
    Evidence: .omo/evidence/task-08-cache.log
  ```

- [x] 9. Wiki → Bible Population Engine

  **What to do**:
  - `WikiToBiblePopulation.populate()`: read all wiki pages, build Bible entities
  - `extractCharacter`, `extractLocation`, `extractPlotThread` from page content
  - Generate `PopulationReport` with warnings and unresolved links
  - File in `packages/kleptowriter-core/src/wiki/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1
  **Blocks**: 35
  **Blocked By**: 5, 7, 8

  **Acceptance Criteria**:
  - 3 wiki pages → 3 Bible entities; warnings for missing fields

  **QA Scenarios**:
  ```
  Scenario: Population from wiki
    Tool: Bash
    Steps: create 3 wiki pages → populate → assert Bible has 3 entities
    Evidence: .omo/evidence/task-09-populate.log
  ```

- [x] 10. Raw-Inputs Scanner + Archivist Interface

  **What to do**:
  - Scan `raw-inputs/` directory, classify files by type
  - `Archivist` agent interface: `processRawInput(paths): WikiUpdate[]`
  - File in `packages/kleptowriter-core/src/agents/archivist/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 1
  **Blocked By**: 7

  **Acceptance Criteria**:
  - Scanner discovers all files; Archivist interface compiles

  **QA Scenarios**:
  ```
  Scenario: Scanner discovers files
    Tool: Bash
    Steps: create test raw-inputs with 3 files → scan → assert all found
    Evidence: .omo/evidence/task-10-scan.log
  ```

- [x] 11. KnowledgeGraph

  **What to do**:
  - Edge list with `knows()`, `learn()`, `queryFactsByCharacter()`
  - Temporal queries respect scene ordering
  - File in `packages/kleptowriter-core/src/data-model/bible/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Knows returns true for learned facts; temporal queries correct

  **QA Scenarios**:
  ```
  Scenario: Knowledge queries
    Tool: Bash
    Steps: learn fact in scene-1 → assert knows() after, not before
    Evidence: .omo/evidence/task-11-knowledge.log
  ```

- [x] 12. DramaticQuestion + PlotThread Tracking

  **What to do**:
  - `DramaticQuestionTracker`: raise, partially-answer, answer
  - `PlotThreadTracker`: introduce, advance, resolve
  - File in `packages/kleptowriter-core/src/data-model/bible/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Question lifecycle works; PlotThread status transitions correct

  **QA Scenarios**:
  ```
  Scenario: Question lifecycle
    Tool: Bash
    Steps: raise → assert open → answer → assert answered
    Evidence: .omo/evidence/task-12-questions.log
  ```

- [x] 13. ArcTracker + ThematicProgression

  **What to do**:
  - Arc progress from completed/total beats; theme intensity tracking
  - File in `packages/kleptowriter-core/src/data-model/bible/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 1
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Progress 0.0-1.0; thematic intensity tracked per scene

  **QA Scenarios**:
  ```
  Scenario: Arc progress
    Tool: Bash
    Steps: 2/4 beats → progress === 0.5
    Evidence: .omo/evidence/task-13-arc.log
  ```

- [x] 14. LiteraryAgent Base Interface + AgentRole

  **What to do**:
  - Define `LiteraryAgent` interface: `{ id, role, capabilityTier, mode, canEvaluate, canGenerate, setStoryContext }`
  - Define `AgentRole` enum with all 17 roles
  - Define `CapabilityTier` type with prose-gen, analysis, research, creativity, etc.
  - Define `AgentConfig` type: model tier mapping, permissions
  - File in `packages/kleptowriter-core/src/agents/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2 (with 15-21)
  **Blocks**: 30
  **Blocked By**: 1, 2

  **Acceptance Criteria**:
  - All 17 roles in enum; interface compiles

  **QA Scenarios**:
  ```
  Scenario: Agent interface
    Tool: Bash
    Steps: create agent impl → assert role matches
    Evidence: .omo/evidence/task-14-agent.log
  ```

- [ ] 15. Mailbox Protocol

  **What to do**:
  - Define `MailboxMessage` types: evaluation, generation, state_update, query, response, broadcast
  - Define `MailboxAddress`: `{ agentId, sessionId? }`
  - Implement `Mailbox.deliver(to, message)` routing
  - Implement `Mailbox.poll(agentId): Message[]` — unread delivery
  - Implement session isolation (messages scoped to writing session)
  - File in `packages/kleptowriter-core/src/mailbox/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 2
  **Blocks**: 30-37
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Deliver + poll returns correct messages per agent
  - Session isolation: messages in session A not visible in B

  **QA Scenarios**:
  ```
  Scenario: Mailbox delivery
    Tool: Bash
    Steps: deliver msg to agent-X → poll(X) → assert msg received
    Evidence: .omo/evidence/task-15-mailbox.log
  ```

- [ ] 16. AgentRegistry

  **What to do**:
  - Implement `AgentRegistry.register(agent)` and `resolve(role): LiteraryAgent`
  - Implement `getEvaluatorsForGate(gateType): LiteraryAgent[]` — find agents by evaluation capability
  - Implement `broadcastToAll(message)` — send message to every registered agent
  - File in `packages/kleptowriter-core/src/agents/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2
  **Blocks**: 30
  **Blocked By**: 14, 15

  **Acceptance Criteria**:
  - Register + resolve returns correct agent
  - getEvaluatorsForGate returns agents with canEvaluate=true

  **QA Scenarios**:
  ```
  Scenario: Registry lookup
    Tool: Bash
    Steps: register agent → resolve → assert correct role
    Evidence: .omo/evidence/task-16-registry.log
  ```

- [ ] 17. Writer + Editor + Critic Agent Interfaces

  **What to do**:
  - `WriterAgent`: `generateScene(plan, bible): SceneDocument`
  - `EditorAgent`: `editScene(prose, styleGuide): Edit[]`
  - `CriticAgent`: `evaluateScene(scene, bible): CritiqueReport`
  - All extend `LiteraryAgent` base
  - File in `packages/kleptowriter-core/src/agents/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2
  **Blocked By**: 14

  **Acceptance Criteria**:
  - All 3 interfaces compile with correct method signatures

  **QA Scenarios**:
  ```
  Scenario: Interface compilation
    Tool: Bash
    Steps: typecheck agents package
    Expected: Zero errors
    Evidence: .omo/evidence/task-17-writers.log
  ```

- [ ] 18. Evaluator Agent Interfaces (8 Agents)

  **What to do**:
  - Define interfaces for: Narratologist, PacingAnalyst, CharacterConsistency, ThematicCoherence, Worldbuilding, Dialogist, Stylesheet, MoodTensionCurator
  - Each: `evaluate(context, bible): EvaluationReport`
  - Each has typed `EvaluationReport` with domain-specific fields
  - File in `packages/kleptowriter-core/src/agents/evaluators/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 2
  **Blocked By**: 14

  **Acceptance Criteria**:
  - All 8 interfaces compile; reports have domain-specific fields

  **QA Scenarios**:
  ```
  Scenario: 8 evaluator interfaces
    Tool: Bash
    Steps: typecheck all evaluator files
    Expected: Zero errors
    Evidence: .omo/evidence/task-18-evaluators.log
  ```

- [ ] 19. Ideator + Researcher + FactChecker Agent Interfaces

  **What to do**:
  - `IdeatorAgent`: `generateIdeas(constraints, bible): Idea[]`
  - `ResearcherAgent`: `research(topic): ResearchNote[]`
  - `FactCheckerAgent`: `verifyFacts(scene, bible): FactCheckReport`
  - File in `packages/kleptowriter-core/src/agents/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2
  **Blocked By**: 14

  **Acceptance Criteria**:
  - All 3 interfaces compile

  **QA Scenarios**:
  ```
  Scenario: Interface compilation
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-19-others.log
  ```

- [ ] 20. Narrative Consistency + Localizer Agent Interfaces

  **What to do**:
  - `NarrativeConsistencyAgent`: `checkGlobalConsistency(bible, scenes): ConsistencyReport`
  - `LocalizerAgent`: `checkCulturalAccuracy(content, target): LocalizationNote[]`
  - File in `packages/kleptowriter-core/src/agents/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Both interfaces compile

  **QA Scenarios**:
  ```
  Scenario: Interface compilation
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-20-global.log
  ```

- [ ] 21. Archivist Agent Interface

  **What to do**:
  - `ArchivistAgent`: `processRawInput(paths, wiki): WikiUpdate[]`
  - `maintainWiki(updates, wiki): WikiDirectory` — create/update pages
  - `indexPages(wiki): IndexEntry[]` — rebuild index.md
  - File in `packages/kleptowriter-core/src/agents/archivist/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 2
  **Blocked By**: 7, 14

  **Acceptance Criteria**:
  - All methods compile; WikiUpdate types correct

  **QA Scenarios**:
  ```
  Scenario: Archivist interface
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-21-archivist.log
  ```

- [ ] 22. MarkovInferenceEngine

  **What to do**:
  - Implement variable-order Markov chain: 1st-order base, higher-order for beats requiring history
  - Implement `predictNext(state): TransitionCandidate[]` — weighted transitions from current beat
  - Implement `train(transitions: Transition[]): void` — build transition matrix
  - Implement `getTransitionProbabilities(fromBeat): Map<beat, number>`
  - Implement `sample(fromBeat): string` — weighted random next beat selection
  - File in `packages/kleptowriter-core/src/narrative/markov/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3 (with 23-29)
  **Blocks**: 25, 28, 29, 30
  **Blocked By**: 4

  **Acceptance Criteria**:
  - sample() returns valid next beat from transition matrix
  - predictNext() returns weighted candidates sorted by probability
  - Higher-order (2nd) transitions preferred when match found

  **QA Scenarios**:
  ```
  Scenario: Markov prediction
    Tool: Bash
    Steps: train with transitions from A→B(0.7) and A→C(0.3) → predict from A → assert B is top
    Evidence: .omo/evidence/task-22-markov.log
  ```

- [ ] 23. 5 Constraint Types

  **What to do**:
  - Define `Constraint` union type: `OrderingConstraint | OccurrenceConstraint | DistanceConstraint | ReferenceConstraint | TensionConstraint`
  - `OrderingConstraint`: beat A must come before/after beat B
  - `OccurrenceConstraint`: beat must appear exactly N times / at least N times / at most N times
  - `DistanceConstraint`: beats A and B must be within N scenes of each other
  - `ReferenceConstraint`: if beat A occurs, beat B must also occur (or must not)
  - `TensionConstraint`: tension must be ≥N / ≤N / between N1-N2 at this beat
  - File in `packages/kleptowriter-core/src/narrative/constraints/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocks**: 24
  **Blocked By**: 4

  **Acceptance Criteria**:
  - All 5 constraint types defined with correct TypeScript discriminated unions
  - Each constraint has `check(progress, bible): ConstraintResult`

  **QA Scenarios**:
  ```
  Scenario: Constraint types
    Tool: Bash
    Steps: create one of each constraint type → typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-23-constraints.log
  ```

- [ ] 24. ConstraintChecker

  **What to do**:
  - Implement `ConstraintChecker.checkAll(progress, bible): ConstraintViolation[]`
  - Implement per-constraint evaluation
  - Implement violation severity (blocking / warning / info)
  - Implement `getSatisfactionScore(progress, bible): number` — fraction of constraints satisfied
  - File in `packages/kleptowriter-core/src/narrative/constraints/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocks**: 25, 30
  **Blocked By**: 23

  **Acceptance Criteria**:
  - Violation detected when constraint is not met
  - Satisfaction score is 0.0-1.0
  - Multiple violations all reported

  **QA Scenarios**:
  ```
  Scenario: Constraint violation
    Tool: Bash
    Steps: setup progress violating ordering constraint → check → assert violation found
    Expected: violation reported
    Evidence: .omo/evidence/task-24-checker.log
  ```

- [ ] 25. ScenePlanner

  **What to do**:
  - Implement `ScenePlanner.enrich(beat, bible, state): ScenePlan`
  - ScenePlan includes: beat, purpose, suggested POV, suggested characters, target tension, plot threads, questions, thematic motifs
  - Implement `generateAlternatives(beat, bible, state, count): ScenePlan[]` — N alternative plans
  - File in `packages/kleptowriter-core/src/narrative/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocks**: 30, 32
  **Blocked By**: 22, 24

  **Acceptance Criteria**:
  - enrich() produces ScenePlan with all required fields
  - generateAlternatives() returns N distinct plans

  **QA Scenarios**:
  ```
  Scenario: ScenePlan generation
    Tool: Bash
    Steps: enrich() a beat → assert plan has pov, characters, tension
    Evidence: .omo/evidence/task-25-planner.log
  ```

- [ ] 26. ScenePlan Types

  **What to do**:
  - Define `ScenePlan` interface: `{ beatId, purpose, suggestedPov, suggestedCharacters, targetTension, plotThreads, dramaticQuestions, thematicMotifs, alternatives? }`
  - Define `ScenePlanMetadata`: `{ complexity, expectedLength, estimatedTokens }`
  - Define `PlanGateDecision`: `{ verdict, evaluatorReports[], alternatives? }`
  - File in `packages/kleptowriter-core/src/narrative/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 3
  **Blocked By**: 4

  **Acceptance Criteria**:
  - All types compile

  **QA Scenarios**:
  ```
  Scenario: Type compilation
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-26-plans.log
  ```

- [ ] 27. 12 Narrative Structure YAML Templates

  **What to do**:
  - Create YAML files for: Hero's Journey, Freytag's Pyramid, Three-Act, Kishotenketsu, Save the Cat, Fichtean Curve, In Medias Res, Frame Narrative, Nonlinear, Epistolary, Parallel Narrative, Circular
  - Each has: `name, description, beats[], transitions[], constraints[]`
  - Each beat: `{ id, name, description, type, transitions: [{ to, weight }] }`
  - File in `packages/kleptowriter-core/src/narrative/templates/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocked By**: 22, 23

  **Acceptance Criteria**:
  - All 12 files parse correctly
  - Each has valid transition probabilities

  **QA Scenarios**:
  ```
  Scenario: All templates parse
    Tool: Bash
    Steps: parse all 12 YAML files → assert no errors
    Evidence: .omo/evidence/task-27-templates.log
  ```

- [ ] 28. MarkovStructureGuidance Interface

  **What to do**:
  - Define `MarkovStructureGuidance` interface: `{ getCurrentBeat(), getNextBeatCandidates(), getConstraintReport(), getPredictedPath(steps), getStoryProgress() }`
  - Implement `MarkovStructureGuidanceImpl` wrapping Markov + constraints + templates
  - File in `packages/kleptowriter-core/src/narrative/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocks**: 30
  **Blocked By**: 22, 24, 27

  **Acceptance Criteria**:
  - getPredictedPath(5) returns 5 future beats with probabilities
  - getConstraintReport() returns current violations

  **QA Scenarios**:
  ```
  Scenario: Structure guidance
    Tool: Bash
    Steps: getPredictedPath(3) → assert returns 3 beats
    Evidence: .omo/evidence/task-28-guidance.log
  ```

- [ ] 29. MarkovPathPredictor

  **What to do**:
  - Implement Monte Carlo simulation for path prediction
  - `simulate(fromBeat, steps, iterations): PathDistribution[]`
  - Each PathDistribution: `{ path: string[], probability: number }`
  - Implement `mostLikelyPath(fromBeat, steps): string[]`
  - File in `packages/kleptowriter-core/src/narrative/markov/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 3
  **Blocked By**: 22

  **Acceptance Criteria**:
  - mostLikelyPath returns valid sequence
  - Probabilities sum to ≈1.0

  **QA Scenarios**:
  ```
  Scenario: Path prediction
    Tool: Bash
    Steps: simulate 1000 iterations → assert most likely path is non-empty
    Evidence: .omo/evidence/task-29-paths.log
  ```

- [ ] 30. PipelineOrchestrator

  **What to do**:
  - Implement `PipelineOrchestrator`: manages Phase 0→1→2→3 transitions
  - Phase enum: `{ MaterialIngestion, Interview, SceneLoop, Revision }`
  - `runPhase(phase, context): PhaseResult` — execute phase with event broadcasting
  - Phase lifecycle: `onEnter → execute → onExit → nextPhase`
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4 (with 31-37)
  **Blocks**: 38-48, F1
  **Blocked By**: 14-16, 22, 24, 28

  **Acceptance Criteria**:
  - Phases execute in correct order
  - PhaseResult contains correct status

  **QA Scenarios**:
  ```
  Scenario: Phase sequencing
    Tool: Bash
    Steps: run phases → assert 0→1→2→3 sequence
    Evidence: .omo/evidence/task-30-orchestrator.log
  ```

- [ ] 31. InterviewProtocol

  **What to do**:
  - Implement InterviewProtocol: AuthorAgent interviews user to extract story depth
  - Define `InterviewQuestion`, `DepthAssessment`, `InterviewSummary`
  - Implement satisfaction gate: all agents must approve depth before Phase 2
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 14

  **Acceptance Criteria**:
  - InterviewSummary produced from questions + assessments
  - Gate rejects when depth insufficient

  **QA Scenarios**:
  ```
  Scenario: Interview gate
    Tool: Bash
    Steps: create interview with shallow answers → gate rejects
    Evidence: .omo/evidence/task-31-interview.log
  ```

- [ ] 32. ScenePlanGate

  **What to do**:
  - Implement `ScenePlanGate.evaluate(plan, bible, structure): GateResult`
  - 6 evaluators check plan (no prose): Narratologist, Pacing, Character, Thematic, World, Mood
  - Weighted voting: each evaluator has weight, calculate aggregate score
  - Implementation: `pass` (>threshold), `conditional` (minor issues), `reject` (blocking)
  - Alternatives: on reject, try next-best Markov path
  - File in `packages/kleptowriter-core/src/pipeline/gates/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 14, 25

  **Acceptance Criteria**:
  - Gate returns pass/conditional/reject
  - Weighted voting produces correct aggregate
  - Rejected plan generates alternative

  **QA Scenarios**:
  ```
  Scenario: Plan gate pass
    Tool: Bash
    Steps: evaluate good plan → assert pass
    Evidence: .omo/evidence/task-32-plan-gate.log
  ```

- [ ] 33. SceneProseGate

  **What to do**:
  - Implement `SceneProseGate.evaluate(scene, bible): GateResult`
  - All evaluators check scene prose (expensive gate)
  - Per-evaluator evaluation reports aggregated
  - Iteration tracking: max 5 revisions per scene
  - File in `packages/kleptowriter-core/src/pipeline/gates/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Evaluation thresholds configurable
  - Revision count increments on rejection
  - Escalates after ceiling exceeded

  **QA Scenarios**:
  ```
  Scenario: Prose gate reject
    Tool: Bash
    Steps: evaluate bad prose → assert reject with reasons
    Evidence: .omo/evidence/task-33-prose-gate.log
  ```

- [ ] 34. ChapterDeductor

  **What to do**:
  - Implement `ChapterDeductor.deduce(scenes, context): ChapterCandidate[]`
  - Break heuristics: POV change (>2 scenes), time jump (>24h), location shift (>3), tension climax→relief, plot thread resolves
  - Confidence scoring per break
  - Implement `finalize(candidates, edits): ChapterAssembly[]`
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 6

  **Acceptance Criteria**:
  - 6 scenes with 2 POV changes → 2 chapter candidates
  - Confidence scores reflect break strength

  **QA Scenarios**:
  ```
  Scenario: Chapter deduction
    Tool: Bash
    Steps: 6 scenes with POV change at scene 3 → 2 chapters proposed
    Evidence: .omo/evidence/task-34-deduction.log
  ```

- [ ] 35. BibleUpdateProtocol

  **What to do**:
  - Implement Bible update: collect `state_update` messages → merge into Bible
  - Conflict resolution: last-writer-wins per field (configurable)
  - Version increment + broadcast `bible_updated` event
  - Incremental: only update entities that changed
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 8, 9, 15

  **Acceptance Criteria**:
  - State update correctly merges into Bible
  - Version increments; event broadcast to registered listeners

  **QA Scenarios**:
  ```
  Scenario: Bible update
    Tool: Bash
    Steps: send state_update → assert Bible version incremented
    Evidence: .omo/evidence/task-35-bible-update.log
  ```

- [ ] 36. IterationBudget

  **What to do**:
  - Define `IterationBudget`: `{ maxRevisionsPerScene, maxTokensPerScene, maxApiCallsPerPhase }`
  - Implement budget tracker: `tryConsume(resource, amount): boolean`
  - Implement "good enough" thresholds per evaluator
  - Implement circuit breaker: after N failures, escalate to human
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Budget exhausted → tryConsume returns false
  - Good enough thresholds configurable per evaluator
  - Circuit breaker fires after ceiling

  **QA Scenarios**:
  ```
  Scenario: Budget exhaustion
    Tool: Bash
    Steps: consume max tokens → next consume fails
    Evidence: .omo/evidence/task-36-budget.log
  ```

- [ ] 37. ConflictResolution

  **What to do**:
  - Implement escalation ladder: weighted voting → lead-agent → human-in-loop
  - WeightedVoting: `{ votes: Map<agentId, Verdict>, weights: Map<agentId, number> }` → aggregate
  - LeadAgentTiebreaker: designated lead makes final call
  - HumanInTheLoop: escalation to user with context summary
  - File in `packages/kleptowriter-core/src/pipeline/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 4
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Weighted voting produces correct aggregate
  - Tiebreaker resolves tied votes
  - Human escalation generates context summary

  **QA Scenarios**:
  ```
  Scenario: Weighted voting
    Tool: Bash
    Steps: 3 agents vote (weights 2,1,1) → aggregate calculates correctly
    Evidence: .omo/evidence/task-37-resolution.log
  ```

- [ ] 38. SceneExtractor

  **What to do**:
  - Implement `SceneExtractor.extract(scene, context): SceneMetadata`
  - Extract: POV (narrator identification), characters present, locations, timeline
  - Extract: tension level (text analysis), mood keywords, plot thread mentions
  - Extract: dramatic questions raised/answered
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 5 (with 39-43)
  **Blocked By**: 4

  **Acceptance Criteria**:
  - Extraction produces SceneMetadata with all required fields
  - Characters present correctly identified from prose

  **QA Scenarios**:
  ```
  Scenario: Metadata extraction
    Tool: Bash
    Steps: extract from test scene → assert POV, characters, location found
    Evidence: .omo/evidence/task-38-extractor.log
  ```

- [ ] 39. MetadataDiff

  **What to do**:
  - Implement `diff(previous, current): MetadataDiff`
  - Detect: new characters, missing characters, location changes, timeline gaps
  - Detect: item transfers (item in X's possession → now in Y's)
  - Detect: knowledge inconsistencies
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 5
  **Blocked By**: 38

  **Acceptance Criteria**:
  - New character in current → flagged in diff
  - Timeline gap > threshold → flagged

  **QA Scenarios**:
  ```
  Scenario: Diff detection
    Tool: Bash
    Steps: scene 1 has char A, scene 2 adds char B → diff flags B as new
    Evidence: .omo/evidence/task-39-diff.log
  ```

- [ ] 40. SceneDatastore

  **What to do**:
  - Implement `SceneDatastore`: store, query, filter scenes by metadata
  - Query by: POV, characters present, location, timeline range, tension range, plot thread
  - Implement `getScenesByCharacter(characterId): SceneDocument[]`
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 5
  **Blocked By**: 4

  **Acceptance Criteria**:
  - Query by POV returns correct scenes
  - getScenesByCharacter includes scenes where character appears

  **QA Scenarios**:
  ```
  Scenario: Scene queries
    Tool: Bash
    Steps: store 3 scenes, query by POV → assert correct 2 returned
    Evidence: .omo/evidence/task-40-datastore.log
  ```

- [ ] 41. CrossAgentQueries

  **What to do**:
  - Implement cross-agent query routing: Agent A asks Agent B a question
  - Query types: character state, location info, plot thread status, evaluation report
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 5
  **Blocked By**: 14, 15, 38

  **Acceptance Criteria**:
  - Cross-agent query returns correct result
  - Unknown query type returns error

  **QA Scenarios**:
  ```
  Scenario: Cross-query
    Tool: Bash
    Steps: query character state → assert correct character returned
    Evidence: .omo/evidence/task-41-cross.log
  ```

- [ ] 42. EvaluationReport Types

  **What to do**:
  - Define `EvaluationReport` base: `{ agentId, sceneId, verdict, confidence, findings[], timestamp }`
  - Define typed reports per evaluator: `PacingReport`, `CharacterConsistencyReport`, etc.
  - Define report persistence: store/load to `evaluations/` directory
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 5
  **Blocked By**: 14

  **Acceptance Criteria**:
  - All report types compile
  - Store/load roundtrip

  **QA Scenarios**:
  ```
  Scenario: Reports compile
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-42-reports.log
  ```

- [ ] 43. AgentNote Collection + Aggregation

  **What to do**:
  - Implement `AgentNote` type: `{ agentId, sceneId, note, severity, category }`
  - Implement note collection: `collectNotes(sceneId): AgentNote[]`
  - Implement aggregation: group by severity, category, agent
  - File in `packages/kleptowriter-core/src/eval/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 5
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Collect returns all notes for a scene
  - Aggregation groups correctly

  **QA Scenarios**:
  ```
  Scenario: Note collection
    Tool: Bash
    Steps: add 3 notes to scene → collect → assert 3 returned
    Evidence: .omo/evidence/task-43-notes.log
  ```

- [ ] 44. SlidingWindowManager

  **What to do**:
  - Implement sliding context window: keep last N scenes + summaries of earlier scenes
  - Window size configurable (default: 5 scenes)
  - File in `packages/kleptowriter-core/src/context/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 6 (with 45-48)
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Window contains last N scenes
  - Scenes outside window have condensed summaries

  **QA Scenarios**:
  ```
  Scenario: Sliding window
    Tool: Bash
    Steps: add 10 scenes, window=5 → assert window has scenes 6-10
    Evidence: .omo/evidence/task-44-window.log
  ```

- [ ] 45. CondensationStrategy

  **What to do**:
  - Implement scene compression: extract key events, ignore prose details
  - `condense(scene): SceneSummary` — 3-5 bullet points
  - Implement tiered condensation: `full` → `summary` → `bullet` → `keyword`
  - File in `packages/kleptowriter-core/src/context/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 6
  **Blocked By**: 3, 4

  **Acceptance Criteria**:
  - Condensation reduces token count significantly
  - All 4 tiers produce different detail levels

  **QA Scenarios**:
  ```
  Scenario: Condensation
    Tool: Bash
    Steps: condense 1000-word scene → assert summary <100 words
    Evidence: .omo/evidence/task-45-condense.log
  ```

- [ ] 46. TieredMemory

  **What to do**:
  - Implement 3-tier memory: hot (current scene + window), warm (recent chapters), cold (full story)
  - `HotMemory`: { currentScene, slidingWindow, activePlotThreads }
  - `WarmMemory`: { sceneSummaries, chapterSummaries, characterStates }
  - `ColdMemory`: { fullScenePaths, fullCharacterBios, timeline }
  - `promote(id): void`, `demote(id): void`, `query(tier, filter): Data[]`
  - File in `packages/kleptowriter-core/src/context/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 6
  **Blocked By**: 3

  **Acceptance Criteria**:
  - Query hot returns current window; query cold returns full history
  - Promote moves data from warm to hot

  **QA Scenarios**:
  ```
  Scenario: Tiered memory
    Tool: Bash
    Steps: add scene → query hot → assert scene in hot → demote → query cold → assert scene in cold
    Evidence: .omo/evidence/task-46-tiers.log
  ```

- [ ] 47. CheckpointManager

  **What to do**:
  - Implement state serialization: save/load pipeline state to `story/checkpoints/`
  - Checkpoint includes: phase, current scene index, Bible version, agent states
  - File in `packages/kleptowriter-core/src/context/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 6
  **Blocked By**: 3, 30

  **Acceptance Criteria**:
  - Checkpoint roundtrip (save → load) produces identical state

  **QA Scenarios**:
  ```
  Scenario: Checkpoint roundtrip
    Tool: Bash
    Steps: save checkpoint → load → assert state identical
    Evidence: .omo/evidence/task-47-checkpoint.log
  ```

- [ ] 48. ContextWindowBudget

  **What to do**:
  - Implement token tracking: count tokens per context item
  - Implement `fitWithinBudget(items, budget): ContextItem[]` — select items that fit token budget
  - Priority-based eviction: lower priority items dropped first
  - File in `packages/kleptowriter-core/src/context/`

  **Recommended Agent Profile**: deep
  **Parallel Group**: Wave 6
  **Blocked By**: 3

  **Acceptance Criteria**:
  - fitWithinBudget returns items within token limit
  - Priority eviction keeps higher-value items

  **QA Scenarios**:
  ```
  Scenario: Budget fitting
    Tool: Bash
    Steps: 3 items (10K, 20K, 30K tokens), budget 25K → assert returns first 2
    Evidence: .omo/evidence/task-48-budget.log
  ```

- [ ] 49. HarnessAdapter Base Interface

  **What to do**:
  - Define `HarnessAdapter` interface: `{ init(config), registerAgents(registry), start(), stop() }`
  - Define `AdapterConfig`: `{ harnessType, pluginPath, agentMap }`
  - File in `packages/kleptowriter-core/src/adapters/`

  **Recommended Agent Profile**: quick
  **Parallel Group**: Wave 7 (with 50-53)
  **Blocked By**: 14

  **Acceptance Criteria**:
  - Base interface compiles

  **QA Scenarios**:
  ```
  Scenario: Adapter base
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-49-adapter.log
  ```

- [ ] 50. OpenCode Adapter

  **What to do**:
  - Implement `OpenCodeAdapter implements HarnessAdapter`
  - Wire agent registry to OpenCode's plugin system
  - Map LiteraryAgent capabilities to OpenCode tool/hook slots
  - Stub: method signatures with TODO implementations
  - File in `packages/adapter-opencode/src/`

  **Recommended Agent Profile**: unspecified-high
  **Parallel Group**: Wave 7
  **Blocked By**: 49

  **Acceptance Criteria**:
  - Interface compiles against OpenCode plugin types

  **QA Scenarios**:
  ```
  Scenario: OpenCode adapter
    Tool: Bash
    Steps: typecheck adapter package
    Expected: Zero errors
    Evidence: .omo/evidence/task-50-opencode.log
  ```

- [ ] 51. Codex Adapter

  **What to do**:
  - Implement `CodexAdapter implements HarnessAdapter`
  - Wire agent registry to Codex CLI plugin system
  - Map to Codex event hooks: SessionStart, UserPromptSubmit, PreToolUse, etc.
  - Stub: method signatures with TODO implementations
  - File in `packages/adapter-codex/src/`

  **Recommended Agent Profile**: unspecified-high
  **Parallel Group**: Wave 7
  **Blocked By**: 49

  **Acceptance Criteria**:
  - Interface compiles against Codex plugin types

  **QA Scenarios**:
  ```
  Scenario: Codex adapter
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-51-codex.log
  ```

- [ ] 52. Claude Code Adapter

  **What to do**:
  - Implement `ClaudeCodeAdapter implements HarnessAdapter`
  - Wire to Claude Code's hook system
  - Stub: method signatures with TODO implementations
  - File in `packages/adapter-claude-code/src/`

  **Recommended Agent Profile**: unspecified-high
  **Parallel Group**: Wave 7
  **Blocked By**: 49

  **Acceptance Criteria**:
  - Interface compiles

  **QA Scenarios**:
  ```
  Scenario: Claude Code adapter
    Tool: Bash
    Steps: typecheck
    Expected: Zero errors
    Evidence: .omo/evidence/task-52-claude.log
  ```

- [ ] 53. Standalone CLI Adapter

  **What to do**:
  - Implement `StandaloneAdapter implements HarnessAdapter`
  - Basic CLI: `kleptowriter init`, `kleptowriter run`, `kleptowriter status`
  - Use Commander.js or minimal CLI framework
  - Stub: method signatures with TODO implementations
  - File in `packages/adapter-standalone/src/`

  **Recommended Agent Profile**: unspecified-high
  **Parallel Group**: Wave 7
  **Blocked By**: 49

  **Acceptance Criteria**:
  - CLI parses basic commands
  - Interface compiles

  **QA Scenarios**:
  ```
  Scenario: Standalone CLI
    Tool: Bash
    Steps: run `kleptowriter --help` → assert help text printed
    Evidence: .omo/evidence/task-53-cli.log
  ```

---

## Final Verification Wave

- [ ] F1. **Integration Tests** — `bun test` across core. Verify wiki → Bible → scene → chapter pipeline end-to-end.
- [ ] F2. **Example Project** — `examples/basic-novel/` with wiki, 3 scenes, chapters. `bun run example` produces valid output.
- [ ] F3. **Documentation** — README, quick start, API reference.
- [ ] F4. **Build Gate** — `bun run build && bun run typecheck && bun test` all green.

---

## Commit Strategy

Waves 0-1: `feat(core): data model + wiki layer`
Waves 2-3: `feat(agents): agent interfaces + narrative engine`
Waves 4-5: `feat(pipeline): orchestration + evaluation`
Wave 6: `feat(context): context management`
Wave 7: `feat(adapters): harness adapters`
Wave FINAL: `chore: integration + docs`

---

## Success Criteria

### Verification Commands
```bash
cd /workspace/kleptowriter && bun run build && bun run typecheck && bun test && bun run example
```

### Final Checklist
- [ ] All TypeScript interfaces from blueprint implemented
- [ ] Scene file read/write roundtrips correctly
- [ ] Wiki → Bible population extracts all entity types
- [ ] Markov engine produces valid transition paths
- [ ] Constraint system catches all 5 violation types
- [ ] Pipeline orchestrator runs all phases in order
- [ ] Both gates evaluate and produce valid decisions
- [ ] Chapter deductor proposes reasonable breaks
- [ ] All 12 narrative structure templates parse correctly
- [ ] All 17 agent interfaces defined with proper types
- [ ] Mailbox delivers messages correctly
- [ ] Adapter interfaces compile for all 4 harnesses
- [ ] Context management handles hot/warm/cold correctly
