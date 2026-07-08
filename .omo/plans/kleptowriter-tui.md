# Kleptowriter TUI Transformation

## TL;DR

> **Quick Summary**: Transform the Kleptowriter CLI (which silently creates directories at cwd) into a Pi-like interactive TUI application with project selection, multi-provider AI support, workflow slash commands, and a welcome screen — by wrapping Pi SDK's `InteractiveMode`.

> **Deliverables**:
> - New `@kleptowriter/adapter-tui` package with Pi InteractiveMode wrapper
> - Interactive project selection workflow (create/list/open projects)
> - 6 slash commands: `/interview`, `/ingest`, `/write`, `/bible`, `/scenes`, `/project`
> - Welcome splash screen (static, non-AI-context)
> - Stub adapter packages removed
> - Release binary builds from adapter-tui
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: Task 1 → Task 3 → Task 6 → Task 11 → F1-F4

---

## Context

### Original Request
The user wants the executable to open into a TUI like Pi's, with orchestrator agent available, ability to connect to multiple AI providers, and a greeting with instructions on getting started (commands like `/interview`, `/ingest`, etc.). Currently the binary just creates directories at cwd without asking.

### Interview Summary
**Key Discussions**:
- **TUI Approach**: Wrap Pi's existing `InteractiveMode` — use Pi's TUI directly via SDK, not build from scratch
- **Orchestrator**: Both — Pi agent session as user-facing interface + kleptowriter-core pipeline as backend capability
- **Multi-Provider**: Pi's built-in ecosystem (Anthropic, OpenAI, Google, etc.) is sufficient
- **Slash Commands**: 6 workflow commands: `/interview`, `/ingest`, `/write`, `/bible`, `/scenes`, `/project`
- **Workspace**: Interactive project selection on first run (list existing, create new)
- **Writing Tools**: Existing 9 AI tools stay unchanged as Pi SDK custom tools
- **Test Strategy**: TDD with `bun test`
- **Greeting**: Static placeholder text that disappears on user input (NOT in AI context)
- **Stub Adapters**: Remove the 4 empty stub packages

**Research Findings**:
- Pi SDK v0.80.3 provides `InteractiveMode` class — full TUI with editor, header, messages, footer, slash commands, model switching, multi-provider auth
- Current `adapter-pi` uses `createAgentSession()` — must switch to `createAgentSessionServices()` → `createAgentSessionFromServices()` → `createAgentSessionRuntime()` → `new InteractiveMode(runtime)`
- Slash commands are registered via `ExtensionFactory` passed to `DefaultResourceLoader({ extensionFactories: [...] })`
- Custom tools are registered as `ToolDefinition[]` in `createAgentSessionFromServices({ customTools })`
- Welcome screen can be a custom header via `InteractiveMode.setExtensionHeader()` that clears on first input

### Metis Review
**Identified Gaps** (addressed):
- **Session creation pipeline must change**: Current code uses `createAgentSession()`, InteractiveMode requires services-based path. Task 3 addresses this.
- **Project selection timing**: Must happen BEFORE `InteractiveMode.run()`. Task 6 addresses pre-TUI prompt.
- **Welcome screen mechanism**: Can't be an AI message — use `setExtensionHeader()` with a component that disappears on input. Task 4 addresses.
- **Project registry location**: `~/.kleptowriter/projects.json` (reasonable default). Applied in Task 6.
- **Multi-provider auth**: Pi's `/login` command handles this out of the box.
- **Slash command vs AI tool boundary**: Slash commands don't call AI tools directly — they set workflow state. Tasks 7-12 address.

---

## Work Objectives

### Core Objective
Build a new `@kleptowriter/adapter-tui` package that wraps Pi SDK's `InteractiveMode` with project selection, workflow slash commands, and a welcome screen, then make it the release entry point.

### Concrete Deliverables
- `packages/adapter-tui/package.json` — New TUI adapter package
- `packages/adapter-tui/src/cli.ts` — Binary entrypoint with pre-TUI project selection
- `packages/adapter-tui/src/session.ts` — InteractiveMode session factory (services-based API path)
- `packages/adapter-tui/src/extension.ts` — Extension factory registering 6 slash commands
- `packages/adapter-tui/src/welcome.ts` — Welcome header component
- `packages/adapter-tui/src/project-manager.ts` — Project registry (list, create, resolve)
- `packages/adapter-tui/src/prompt/system.md` — Literary writing system prompt (copied from adapter-pi)
- `packages/adapter-tui/src/project-manager.test.ts` — TDD tests for project manager
- `packages/adapter-tui/src/session.test.ts` — TDD tests for session factory
- `packages/adapter-tui/src/extension.test.ts` — TDD tests for slash command registration
- Stub adapter directories removed from `packages/`
- Updated release workflow building from adapter-tui

### Definition of Done
- [ ] `bun run build` passes with zero errors
- [ ] `bun test` passes with zero failures
- [ ] Running the binary opens project selection prompt → creates/opens story workspace → launches Pi-style TUI with welcome screen
- [ ] All 6 slash commands appear in autocomplete and execute their workflow actions
- [ ] `/model` and `/login` commands (from Pi) work out of the box
- [ ] Welcome screen shows static text, disappears on first user input, never appears in AI context
- [ ] Release binary builds successfully: `bun build --compile --target=bun-linux-x64-baseline packages/adapter-tui/src/cli.ts`
- [ ] Stub adapter directories (`adapter-claude-code`, `adapter-codex`, `adapter-opencode`, `adapter-standalone`) removed

### Must Have
- Pi-style TUI with editor, messages, footer, model switching
- Interactive project selection (list existing, create new) on startup
- All 9 existing writing tools available as AI custom tools
- 6 slash commands registered and functional
- Welcome screen outside AI context, disappears on user input
- Multi-provider auth via Pi's built-in `/login` command
- All existing scene/bible/chapter tool tests pass unchanged

### Must NOT Have (Guardrails)
- NO rewriting of existing 9 AI tools (scene-tools, bible-tools, eval-tools, etc.)
- NO modification to `kleptowriter-core` package
- NO modification to system prompt (`prompt/system.md`)
- NO new writing tools beyond the existing 9
- NO cloud sync, web/mobile UI, plugin system, i18n, custom auth, analytics
- NO custom provider auth — use Pi's built-in `/login`
- NO deletion of existing `adapter-pi` package (keep as reference)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: TDD — tests written before implementation
- **Framework**: bun test
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI/TUI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **Library/Module**: Use Bash (bun REPL) — Import, call functions, compare output
- **Build/Test**: Use Bash — Run build commands, parse output

---

## Execution Strategy

### Parallel Execution Waves
```
Wave 1 (Foundation — can start in parallel):
├── Task 1: Scaffold adapter-tui package
├── Task 2: Copy 9 existing tools + system prompt from adapter-pi
├── Task 3: Build InteractiveMode session factory (services-based API)
├── Task 4: Build welcome header component (static, clears on input)
├── Task 5: Build project manager (registry CRUD)

Wave 2 (Core wiring — depends on Wave 1):
├── Task 6: Build CLI entrypoint with pre-TUI project selection flow
├── Task 7: Build slash command extension factory (framework)
├── Task 8: Implement /interview and /ingest commands
├── Task 9: Implement /write and /bible commands
├── Task 10: Implement /scenes and /project commands

Wave 3 (Integration & cleanup):
├── Task 11: Wire everything together — main() flow composes project selection → InteractiveMode with extensions + tools + welcome
├── Task 12: Remove stub adapter packages from workspace
├── Task 13: Update release workflow to build from adapter-tui
├── Task 14: Update README with new usage instructions

Wave FINAL (Parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix
- **1**: — — 3, 6, 11
- **2**: 1 — 11
- **3**: 1 — 6, 11
- **4**: 1 — 11
- **5**: 1 — 6, 10
- **6**: 3, 5 — 11
- **7**: 1 — 8, 9, 10
- **8**: 7 — 11
- **9**: 7 — 11
- **10**: 5, 7 — 11
- **11**: 2, 4, 6, 8, 9, 10 — 12, 13, 14
- **12**: — — 14
- **13**: — — 14
- **14**: 11, 12, 13 — F1-F4

### Agent Dispatch Summary
- **Wave 1**: 5 agents — T1-2 → `quick`, T3 → `deep`, T4 → `visual-engineering`, T5 → `deep`
- **Wave 2**: 6 agents — T6 → `deep`, T7 → `deep`, T8-10 → `quick`
- **Wave 3**: 4 agents — T11 → `deep`, T12-13 → `quick`, T14 → `writing`
- **FINAL**: 4 agents — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. **Scaffold `@kleptowriter/adapter-tui` package**

  **What to do**:
  - Create `packages/adapter-tui/package.json` with `name: "@kleptowriter/adapter-tui"`, type `module`, dependencies on `@kleptowriter/kleptowriter-core` (workspace), `@earendil-works/pi-coding-agent` (matching version), `@sinclair/typebox`, devDependencies `@types/bun`, `typescript`
  - Create `packages/adapter-tui/tsconfig.json` extending root
  - Create `packages/adapter-tui/src/` directory structure
  - Add `start` script: `"start": "bun run src/cli.ts"` and `build` script
  - Must pass `bun run typecheck` at package level
  - Register package in root `package.json` workspaces

  **Must NOT do**:
  - Do NOT add unused dependencies
  - Do NOT copy runtime files yet (that's Task 2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard package scaffolding — well-defined, minimal logic
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5)
  - **Blocks**: Tasks 3, 6, 12
  - **Blocked By**: None (start immediately)

  **References**:
  - `packages/adapter-pi/package.json` — Exact dependency versions to copy
  - `packages/adapter-pi/tsconfig.json` — TS config pattern
  - Root `package.json` — Workspace registration pattern (`"workspaces": ["packages/*"]`)

  **Acceptance Criteria** (TDD):
  - [ ] Test: `packages/adapter-tui/package.json` exists with correct name and workspace reference
  - [ ] `bun install` succeeds at root level
  - [ ] `bun run --filter @kleptowriter/adapter-tui typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Package is scaffolded correctly
    Tool: Bash
    Steps:
      1. Run `ls packages/adapter-tui/package.json` → exists
      2. Run `bun install` at root → exits 0
      3. Run `bun run --filter @kleptowriter/adapter-tui typecheck` → exits 0, no type errors
    Expected Result: Package is installable and typechecks pass
    Evidence: .omo/evidence/task-1-scaffold.txt

  Scenario: Package is registered in workspace
    Tool: Bash
    Steps:
      1. Run `cat package.json | grep -q adapter-tui` → exits 0
    Expected Result: Workspace includes adapter-tui
    Evidence: .omo/evidence/task-1-workspace.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): scaffold new TUI adapter package`
  - Files: `packages/adapter-tui/package.json`, `packages/adapter-tui/tsconfig.json`, `package.json` (workspaces update)

- [x] 2. **Copy existing 9 tools + system prompt from adapter-pi**

  **What to do**:
  - Copy `packages/adapter-pi/src/tools/` directory to `packages/adapter-tui/src/tools/` (all 13 files)
  - Copy `packages/adapter-pi/src/prompt/system.md` to `packages/adapter-tui/src/prompt/system.md`
  - Copy `packages/adapter-pi/src/index.ts` to `packages/adapter-tui/src/index.ts` (tool + session exports)
  - Copy `packages/adapter-pi/src/bible/` directory
  - Update imports in copied files to use `@kleptowriter/kleptowriter-core` (should already be correct)
  - DO NOT modify any copied file's logic
  - `bun test` must pass with original adapter-pi tests still passing AND new adapter-tui build succeeding

  **Must NOT do**:
  - Do NOT modify any tool implementation
  - Do NOT modify system prompt

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - Reason: Pure file copy operation — no logic changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-5)
  - **Blocks**: Task 12 (integration)
  - **Blocked By**: Task 1 (scaffold)

  **References**:
  - `packages/adapter-pi/src/tools/` — Source directory with 13 files
  - `packages/adapter-pi/src/prompt/system.md` — System prompt file
  - `packages/adapter-pi/src/bible/` — Bible persistence files

  **Acceptance Criteria** (TDD):
  - [ ] Test: All 13 tool files exist at `packages/adapter-tui/src/tools/`
  - [ ] Test: `packages/adapter-tui/src/prompt/system.md` exists
  - [ ] Test: `packages/adapter-tui/src/index.ts` exports `allKleptowriterTools`
  - [ ] `bun run --filter @kleptowriter/adapter-tui typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Tools are copied correctly
    Tool: Bash
    Steps:
      1. Run `ls packages/adapter-tui/src/tools/*.ts | wc -l` → 13 files
      2. Run `diff -r packages/adapter-pi/src/tools/ packages/adapter-tui/src/tools/` → no differences
    Expected Result: All 13 tool files exist, identical to adapter-pi
    Evidence: .omo/evidence/task-2-tools-copied.txt

  Scenario: Build succeeds with copied files
    Tool: Bash
    Steps:
      1. Run `bun run --filter @kleptowriter/adapter-tui build` → exits 0
    Expected Result: TypeScript compilation succeeds
    Evidence: .omo/evidence/task-2-build.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): copy tools and system prompt from adapter-pi`
  - Files: `packages/adapter-tui/src/tools/*`, `packages/adapter-tui/src/prompt/system.md`, `packages/adapter-tui/src/index.ts`

- [x] 3. **Build InteractiveMode session factory (services-based API)**

  **What to do**:
  - Write `packages/adapter-tui/src/session.ts` — creates an InteractiveMode-ready session using the Pi SDK's services-based API path
  - **Architecture**: Must follow the pattern:
    ```
    DefaultResourceLoader({ extensionFactories, systemPromptOverride }) →
    createAgentSessionServices({ resourceLoader, cwd }) →
    createAgentSessionFromServices({ customTools, noTools: "builtin" }) →
    createAgentSessionRuntime({ sessionFactory, sessionManager }) →
    new InteractiveMode(runtime, { onEvent, ... })
    ```
  - Import `allKleptowriterTools` from `./tools/registry.js`
  - Import system prompt from `./prompt/system.md` with text import assertion
  - Accept `cwd`, optional `extensionFactories`, optional `onEvent` callback
  - Export `createTuiSession(options)` returning `InteractiveMode` instance
  - Write TDD test first: `packages/adapter-tui/src/session.test.ts`
    - Mock `createAgentSessionServices`, `createAgentSessionFromServices`, `createAgentSessionRuntime`
    - Test that `customTools: allKleptowriterTools` is passed through
    - Test that `noTools: "builtin"` is set
    - Test that `systemPromptOverride` returns the system prompt text

  **Must NOT do**:
  - Do NOT include project selection logic (that's Task 6)
  - Do NOT register slash commands here (that's Task 7)
  - Do NOT add welcome screen here (that's Task 4)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding Pi SDK services API path — non-trivial integration
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-5)
  - **Blocks**: Task 6, 12
  - **Blocked By**: Task 1 (scaffold)

  **References**:
  - `packages/adapter-pi/src/session.ts` — Current session creation for reference (uses `createAgentSession`)
  - Pi SDK types: `createAgentSessionServices`, `createAgentSessionFromServices`, `createAgentSessionRuntime`, `DefaultResourceLoader`, `InteractiveMode`, `InteractiveModeOptions`
  - Pi SDK docs: Uses `noTools: "builtin"` + `customTools: ToolDefinition[]` pattern

  **Acceptance Criteria** (TDD):
  - [ ] Test: `createTuiSession()` calls `createAgentSessionServices` with resource loader
  - [ ] Test: `createTuiSession()` passes `customTools: allKleptowriterTools` through
  - [ ] Test: `createTuiSession()` passes `noTools: "builtin"`
  - [ ] Test: Return type is `InteractiveMode` instance (or compatible)
  - [ ] `bun test packages/adapter-tui/src/session.test.ts` → PASS (≥2 tests)

  **QA Scenarios**:
  ```
  Scenario: Session factory creates InteractiveMode correctly
    Tool: Bash
    Steps:
      1. Run `bun test packages/adapter-tui/src/session.test.ts` → exits 0, ≥2 pass
    Expected Result: All tests pass
    Evidence: .omo/evidence/task-3-session-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): add InteractiveMode session factory with services API`
  - Files: `packages/adapter-tui/src/session.ts`, `packages/adapter-tui/src/session.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/session.test.ts`

- [x] 4. **Build welcome header component**

  **What to do**:
  - Write `packages/adapter-tui/src/welcome.ts`
  - Create a component that renders a static welcome message using the Pi TUI `Component` interface
  - Welcome text:
    ```
    ╔══════════════════════════════════════════════════╗
    ║           Kleptowriter — Novel Writing Studio    ║
    ╚══════════════════════════════════════════════════╝

    Welcome! Here's how to get started:

      /interview   Start a new greenfield project interview
      /ingest      Process existing materials into the bible
      /write       Enter scene writing mode
      /bible       View or edit the story bible
      /scenes      List all scenes with word counts
      /project     Create, open, or switch projects

    Type any message or command to begin.

    Press /hotkeys for all Pi shortcuts.
    ```
  - Component MUST implement the Pi TUI `Component` interface (render, handleInput)
  - On first user input (any key), the welcome screen disappears
  - Export `createWelcomeComponent(options)` factory
  - Write TDD test first: `packages/adapter-tui/src/welcome.test.ts`
    - Test that welcome text contains expected commands
    - Test that component has `handleInput` that signals dismissal
    - Test that after dismissal, rendered lines are empty

  **Must NOT do**:
  - Do NOT put welcome text into AI message history
  - Do NOT make welcome text interactive beyond dismissal on keypress

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires Pi TUI Component interface — rendering and input handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5)
  - **Blocks**: Task 12 (integration)
  - **Blocked By**: Task 1 (scaffold)

  **References**:
  - `@earendil-works/pi-tui` package: `Component`, `Container`, `Text` interfaces
  - Pi SDK's `InteractiveMode.setExtensionHeader(component | undefined)` — to show/clear welcome
  - Metis finding: welcome rendered via custom header, cleared by setting to `undefined` on first input

  **Acceptance Criteria** (TDD):
  - [ ] Test: `createWelcomeComponent()` returns object with `render()`, `handleInput()` methods
  - [ ] Test: rendered output contains "Kleptowriter — Novel Writing Studio"
  - [ ] Test: rendered output contains "/interview"
  - [ ] Test: after `handleInput` is called, component signals dismissal (dismissed property = true)
  - [ ] `bun test packages/adapter-tui/src/welcome.test.ts` → PASS (≥4 tests)

  **QA Scenarios**:
  ```
  Scenario: Welcome component renders correctly
    Tool: Bash (bun REPL)
    Steps:
      1. Import `createWelcomeComponent` from built module
      2. Call `component.render(80)` → returns array of strings
      3. Verify output contains expected commands
    Expected Result: Welcome text includes all 6 slash commands and app name
    Evidence: .omo/evidence/task-4-welcome-render.txt

  Scenario: Welcome component dismisses on input
    Tool: Bash (bun REPL)
    Steps:
      1. Create component → component.dismissed === false
      2. Call component.handleInput("a") → component.dismissed === true
    Expected Result: First input dismisses the welcome screen
    Evidence: .omo/evidence/task-4-welcome-dismiss.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): add welcome header component with input dismissal`
  - Files: `packages/adapter-tui/src/welcome.ts`, `packages/adapter-tui/src/welcome.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/welcome.test.ts`

- [x] 5. **Build project manager (registry CRUD)**

  **What to do**:
  - Write `packages/adapter-tui/src/project-manager.ts`
  - Project registry stored at `$HOME/.kleptowriter/projects.json` as JSON array:
    ```json
    [
      { "name": "My Mystery Novel", "path": "/home/user/novels/my-mystery", "created": "2026-07-08T...", "lastOpened": "2026-07-08T..." }
    ]
    ```
  - Export functions:
    - `listProjects(): ProjectInfo[]` — reads registry, returns sorted by lastOpened desc
    - `createProject(name: string, path: string): ProjectInfo` — creates directory, scaffolds `story/scenes/`, writes `bible.json` (empty structure), writes registry entry
    - `resolveProject(path?: string): ProjectInfo | null` — if path given, load that project; if no path, return most recent (or null for new user)
    - `touchProject(name: string): void` — updates `lastOpened` timestamp
  - Scaffolding: `story/scenes/` dir, `story/bible.json` with `{ "characters": [], "locations": [], "plotThreads": [] }`, `story/.pi-session/` dir
  - Write TDD test first: `packages/adapter-tui/src/project-manager.test.ts`
    - Test `listProjects` returns empty array for new user
    - Test `createProject` creates directory structure and writes registry
    - Test `listProjects` returns newly created project
    - Test `createProject` with existing path: overwrite with warning
    - Test isolation: use tmpdir for each test, HOME override

  **Must NOT do**:
  - Do NOT add project deletion functionality

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Filesystem logic + JSON persistence + TDD

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4)
  - **Blocks**: Tasks 6, 11
  - **Blocked By**: Task 1 (scaffold)

  **References**:
  - `packages/adapter-pi/src/cli.ts` — Current workspace scaffolding pattern
  - `packages/adapter-pi/src/bible/persistence.ts` — Bible persistence pattern

  **Acceptance Criteria** (TDD):
  - [ ] Test: `listProjects()` on fresh install returns `[]`
  - [ ] Test: `createProject("test", tmpDir)` creates `tmpDir/story/scenes/`, `tmpDir/story/bible.json`
  - [ ] Test: `listProjects()` returns array with 1 entry after creation
  - [ ] Test: `resolveProject()` returns most recent or null for empty registry
  - [ ] `bun test packages/adapter-tui/src/project-manager.test.ts` → PASS (≥4 tests)

  **QA Scenarios**:
  ```
  Scenario: Create project creates correct structure
    Tool: Bash
    Steps:
      1. Run bun REPL creating project in temp dir
      2. Verify `ls {tmp}/story/scenes/` exists
      3. Verify `cat {tmp}/story/bible.json` is valid JSON
    Expected Result: Full story workspace created
    Evidence: .omo/evidence/task-5-create-project.txt

  Scenario: List projects returns created projects
    Tool: Bash
    Steps:
      1. Create 2 projects in sequence
      2. Call listProjects() → returns 2 entries
    Expected Result: Registry lists all projects
    Evidence: .omo/evidence/task-5-list-projects.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): add project manager with registry CRUD`
  - Files: `packages/adapter-tui/src/project-manager.ts`, `packages/adapter-tui/src/project-manager.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/project-manager.test.ts`

- [x] 6. **Build CLI entrypoint with pre-TUI project selection**

  **What to do**:
  - Write `packages/adapter-tui/src/cli.ts` as the binary entrypoint
  - Flow:
    1. Load project registry (`listProjects()`)
    2. If no projects → prompt "Create new project" with name + path (simple console prompt)
    3. If projects exist → show numbered list, let user pick or create new
    4. Call `createProject()` or use selected project's path as cwd
    5. Call `touchProject()` to update lastOpened
    6. Create `createTuiSession()` with the project's cwd and extension factory
    7. Register welcome component via `setExtensionHeader(welcomeComponent)`
    8. Setup SIGINT handler (save → cleanup)
    9. On first user input → clear welcome (`setExtensionHeader(undefined)`)
    10. Start TUI loop
  - Project selection is a pre-TUI text prompt
  - SIGINT during project selection: graceful exit
  - No API key? Pi's TUI shows login dialog
  - Write TDD test: `packages/adapter-tui/src/cli.test.ts`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-component integration flow

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 3 (session), 5 (project manager)

  **References**: Tasks 3, 4, 5 outputs

  **Acceptance Criteria** (TDD):
  - [ ] Test: New user flow → "Create new project" prompt shown
  - [ ] Test: Returning user flow → project list shown
  - [ ] Test: SIGINT during project selection exits cleanly
  - [ ] Test: Welcome component registered via `setExtensionHeader`
  - [ ] `bun test packages/adapter-tui/src/cli.test.ts` → PASS (≥4 tests)

  **QA Scenarios**:
  ```
  Scenario: New user creates first project
    Tool: interactive_bash with tmux
    Steps:
      1. Use isolated HOME, run CLI
      2. See "No projects found. Create a new project?"
      3. Enter "My Novel"
      4. See "Project created at ..."
    Expected Result: New user flow works
    Evidence: .omo/evidence/task-6-new-user.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): add CLI entrypoint with pre-TUI project selection`
  - Files: `packages/adapter-tui/src/cli.ts`, `packages/adapter-tui/src/cli.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/cli.test.ts`

- [x] 7. **Build slash command extension factory (framework)**

  **What to do**:
  - Write `packages/adapter-tui/src/extension.ts`
  - Create `ExtensionFactory` registering 6 commands:
    - `/interview`, `/ingest`, `/write`, `/bible`, `/scenes`, `/project`
  - Each via `ExtensionAPI.registerCommand({ name, description, handler })`
  - Handler sends contextual AI message via `context.actions.sendMessage()`
  - Export `createKleptowriterExtension(): ExtensionFactory`
  - TDD test: `packages/adapter-tui/src/extension.test.ts`

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2
  - **Blocks**: Tasks 8, 9, 10
  - **Blocked By**: Task 1

  **Acceptance Criteria** (TDD):
  - [ ] Test: All 6 command names registered
  - [ ] Test: Each handler calls `sendMessage`
  - [ ] `bun test packages/adapter-tui/src/extension.test.ts` → PASS (≥3 tests)

  **QA Scenarios**: Mock test via bun REPL

  **Commit**: YES
  - Message: `feat(adapter-tui): add extension factory with 6 slash commands`
  - Files: `packages/adapter-tui/src/extension.ts`, `packages/adapter-tui/src/extension.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/extension.test.ts`

- [x] 8. **Implement `/interview` and `/ingest` commands**

  **What to do**:
  - Implement handlers for `/interview` and `/ingest` in `packages/adapter-tui/src/extension.ts`
  - `/interview`: Sends AI message about Material Ingestion phase, prompts AI to ask about premise/genre/characters/setting. Accepts user args (e.g. `/interview mystery novel set in 1920s Cairo`)
  - `/ingest`: Sends AI message about processing existing materials (notes, outlines, research docs). Accepts user text as args
  - Both commands register via the existing extension factory from Task 7
  - Update tests in `packages/adapter-tui/src/extension.test.ts`
  - Write TDD tests FIRST

  **Must NOT do**:
  - Do NOT create new AI tools — send messages to steer the AI, not bypass it
  - Do NOT modify system prompt or any tool files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, well-defined message crafting

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 7 (extension framework)

  **References**:
  - `packages/adapter-tui/src/extension.ts` — Extension factory where commands are registered
  - `packages/adapter-pi/src/prompt/system.md` — The Four-Phase Workflow section for prompt crafting guidance

  **Acceptance Criteria** (TDD):
  - [ ] Test: `/interview` handler sends message containing "premise" or "interview"
  - [ ] Test: `/interview` with args includes user text in the AI message
  - [ ] Test: `/ingest` handler sends message containing "ingest" or "material"
  - [ ] `bun test packages/adapter-tui/src/extension.test.ts` → PASS (updated)

  **QA Scenarios**:
  ```
  Scenario: /interview sends correct AI guidance
    Tool: Bash (bun REPL with mock)
    Steps:
      1. Create mock ExtensionAPI with sendMessage spy
      2. Invoke handler with args "mystery novel Cairo"
      3. Verify sendMessage was called
      4. Verify message text contains "interview" and "mystery"
    Expected Result: AI receives prompt guiding it to interview phase
    Evidence: .omo/evidence/task-8-interview.txt

  Scenario: /ingest sends correct AI guidance
    Tool: Bash (bun REPL with mock)
    Steps: Same pattern, verify ingest-related terms in message
    Expected Result: AI receives ingestion phase guidance
    Evidence: .omo/evidence/task-8-ingest.txt
  ```

  **Commit**: Groups with 9, 10
  - Message: `feat(adapter-tui): implement /interview, /ingest, /write, /bible, /scenes, /project commands`
  - Files: `packages/adapter-tui/src/extension.ts`, `packages/adapter-tui/src/extension.test.ts`
  - Pre-commit: `bun test packages/adapter-tui/src/extension.test.ts`

- [x] 9. **Implement `/write` and `/bible` commands**

  **What to do**:
  - Implement handlers for `/write` and `/bible` in `packages/adapter-tui/src/extension.ts`
  - `/write`: Sends AI message about entering scene writing mode, start scene loop
  - `/bible`: Sends AI message to query bible and present current state
  - Both accept optional user args
  - Write TDD tests

  **Must NOT do**:
  - Do NOT create new AI tools

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with 8, 10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 7

  **Acceptance Criteria** (TDD):
  - [ ] Test: `/write` handler sends message containing "write" or "scene"
  - [ ] Test: `/bible` handler sends message containing "bible"
  - [ ] `bun test` passes

  **QA Scenarios**:
  ```
  Scenario: /write sends scene-writing guidance
    Tool: Bash (bun REPL with mock)
    Steps: Verify sendMessage called with writing-related text
    Expected Result: AI enters scene writing mode
    Evidence: .omo/evidence/task-9-write.txt

  Scenario: /bible sends bible-query guidance
    Tool: Bash (bun REPL with mock)
    Steps: Verify sendMessage called with bible-related text
    Expected Result: AI queries and presents bible
    Evidence: .omo/evidence/task-9-bible.txt
  ```

  **Commit**: Groups with 8, 10

- [x] 10. **Implement `/scenes` and `/project` commands**

  **What to do**:
  - Implement handlers for `/scenes` and `/project` in `packages/adapter-tui/src/extension.ts`
  - `/scenes`: Sends AI message to list all scenes with word counts
  - `/project`: Without args → shows current project info. With args → attempts to switch projects using project manager
  - Write TDD tests

  **Must NOT do**:
  - Do NOT implement project deletion

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES — Wave 2 (with 8, 9)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 5 (project manager for /project), 7 (extension)

  **Acceptance Criteria** (TDD):
  - [ ] Test: `/scenes` sends message containing "scenes"
  - [ ] Test: `/project` without args lists current project
  - [ ] `bun test` passes

  **QA Scenarios**:
  ```
  Scenario: /scenes sends scene-listing guidance
    Tool: Bash (bun REPL with mock)
    Steps: Verify sendMessage called with scene-listing text
    Expected Result: AI lists all scenes
    Evidence: .omo/evidence/task-10-scenes.txt

  Scenario: /project shows current project
    Tool: Bash (bun REPL with mock)
    Steps: Invoke /project handler with mock project state
    Expected Result: AI message references current project
    Evidence: .omo/evidence/task-10-project.txt
  ```

  **Commit**: Groups with 8, 9

- [x] 11. **Integrate all components — main() wiring**

  **What to do**:
  - Update `packages/adapter-tui/src/cli.ts` to compose the full flow:
    1. Pre-TUI project selection (from Task 6)
    2. Create session via `createTuiSession()` passing extension factory and project cwd
    3. Register welcome component via `setExtensionHeader(welcomeComponent)`
    4. Set up dismiss-on-input handler
    5. Start InteractiveMode
    6. Handle shutdown (SIGINT → save session → dispose)
  - Ensure `bun run start` works end-to-end (with mock/TTY environment)
  - Update `packages/adapter-tui/src/index.ts` to export all public APIs
  - Write integration tests

  **Must NOT do**:
  - Do NOT modify any tool files or system prompt
  - Do NOT add new tooling or extra features

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration of multiple components — requires understanding the full flow

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 13, 14
  - **Blocked By**: Tasks 2 (tools), 4 (welcome), 6 (CLI), 8-10 (commands)

  **References**:
  - All files in `packages/adapter-tui/src/` — integration point

  **Acceptance Criteria**:
  - [ ] Test: Full integration test verifies startup sequence (project selection → session → welcome)
  - [ ] `bun run start` initializes project selection → session → welcome screen
  - [ ] `bun run build` typechecks pass
  - [ ] `bun test` passes all tests

  **QA Scenarios**:
  ```
  Scenario: Full startup sequence
    Tool: interactive_bash with tmux
    Preconditions: Isolated HOME, no existing projects
    Steps:
      1. Run `bun run src/cli.ts`
      2. See project creation prompt "No projects found..."
      3. Create project "Test Novel"
      4. See welcome screen with slash commands
      5. Type "a" → welcome disappears
    Expected Result: Full TUI startup works
    Failure Indicators: Crash on startup, welcome screen doesn't appear, welcome screen in AI context
    Evidence: .omo/evidence/task-11-startup.txt

  Scenario: SIGINT during startup
    Tool: interactive_bash with tmux
    Preconditions: Isolated HOME
    Steps:
      1. Run CLI, see project prompt
      2. Press Ctrl+C
    Expected Result: Clean exit (exit code 0), no crash
    Evidence: .omo/evidence/task-11-sigint.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): integrate all components`
  - Files: `packages/adapter-tui/src/cli.ts`, `packages/adapter-tui/src/index.ts`
  - Pre-commit: `bun test`

- [x] 12. **Remove stub adapter packages**

  **What to do**:
  - Remove 4 empty stub adapter directories:
    - `packages/adapter-claude-code/`
    - `packages/adapter-codex/`
    - `packages/adapter-opencode/`
    - `packages/adapter-standalone/`
  - Verify `bun install` and `bun run build` still work

  **Must NOT do**:
  - Do NOT remove `packages/adapter-pi/` or `packages/kleptowriter-core/`

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - YES — Wave 3 (with 11, 13, 14)
  - Blocked By: Nothing

  **Acceptance Criteria**:
  - [ ] `ls packages/adapter-claude-code/` returns error (directory gone)
  - [ ] `bun install` exits 0
  - [ ] `bun run build` exits 0

  **QA Scenarios**:
  ```
  Scenario: Stub packages removed
    Tool: Bash
    Steps:
      1. `ls packages/adapter-claude-code/` → "No such file or directory"
      2. `bun install` → exit 0
      3. `bun run build` → exit 0
    Expected Result: Clean removal
    Evidence: .omo/evidence/task-12-stubs-removed.txt
  ```

  **Commit**: YES
  - Message: `chore: remove empty stub adapter packages`
  - Files: (deleted directories)

- [x] 13. **Update release workflow for adapter-tui**

  **What to do**:
  - Update `.github/workflows/release.yml`:
    - Change build paths from `packages/adapter-pi/src/cli.ts` to `packages/adapter-tui/src/cli.ts`
    - All 4 platform targets: darwin-arm64, darwin-x64, linux-arm64, linux-x64
  - Verify build works:
    ```bash
    bun build --compile --target=bun-linux-x64-baseline packages/adapter-tui/src/cli.ts --outfile dist/kleptowriter-linux-x64
    ```

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - YES — Wave 3 (with 11, 12, 14)
  - Blocked By: Nothing

  **Acceptance Criteria**:
  - [ ] Workflow YAML references `adapter-tui/src/cli.ts` (not `adapter-pi/src/cli.ts`)
  - [ ] Build command succeeds for at least one platform target

  **QA Scenarios**:
  ```
  Scenario: Workflow builds from adapter-tui
    Tool: Bash
    Steps:
      1. `grep -c "adapter-tui" .github/workflows/release.yml` → ≥4
      2. `grep -c "adapter-pi" .github/workflows/release.yml` → 0
    Expected Result: Workflow paths updated
    Evidence: .omo/evidence/task-13-workflow.txt
  ```

  **Commit**: YES
  - Message: `ci: update release workflow to build from adapter-tui`
  - Files: `.github/workflows/release.yml`

- [x] 14. **Update README**

  **What to do**:
  - Update root `README.md`:
    - New binary entrypoint, project selection flow
    - Slash commands documentation
    - Updated packages table (remove stubs, add adapter-tui)
    - Updated architecture section
  - Add `packages/adapter-tui/README.md` with detailed documentation

  **Recommended Agent Profile**:
  - **Category**: `writing`

  **Parallelization**:
  - YES — Wave 3 (with 11, 12, 13)
  - Blocked By: Nothing

  **Acceptance Criteria**:
  - [ ] README references adapter-tui as entry point
  - [ ] Slash commands documented
  - [ ] Stub adapters no longer listed in packages table

  **QA Scenarios**:
  ```
  Scenario: README is correct
    Tool: Bash
    Steps:
      1. `grep -c "adapter-tui" README.md` → ≥1
      2. `grep -c "adapter-opencode" README.md` → 0
    Expected Result: README is updated
    Evidence: .omo/evidence/task-14-readme.txt
  ```

  **Commit**: YES
  - Message: `docs: update README for adapter-tui`
  - Files: `README.md`, `packages/adapter-tui/README.md`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` and `bun test`. Review all new files for: type suppression, empty catches, debug logging, unused imports, commented-out code. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: no HOME dir, empty projects.json, corrupt projects.json, SIGINT during selection.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify everything built — nothing missing AND nothing beyond scope. Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Task 1**: `feat(adapter-tui): scaffold new TUI adapter package` - packages/adapter-tui/package.json, tsconfig.json, root package.json
- **Task 2**: `feat(adapter-tui): copy tools and system prompt from adapter-pi` - src/tools/*, src/prompt/system.md, src/index.ts
- **Task 3**: `feat(adapter-tui): add InteractiveMode session factory with services API` - src/session.ts, session.test.ts
- **Task 4**: `feat(adapter-tui): add welcome header component with input dismissal` - src/welcome.ts, welcome.test.ts
- **Task 5**: `feat(adapter-tui): add project manager with registry CRUD` - src/project-manager.ts, project-manager.test.ts
- **Task 6**: `feat(adapter-tui): add CLI entrypoint with pre-TUI project selection` - src/cli.ts, cli.test.ts
- **Task 7**: `feat(adapter-tui): add extension factory with 6 slash commands` - src/extension.ts, extension.test.ts
- **Tasks 8-10**: `feat(adapter-tui): implement all 6 slash command handlers` - src/extension.ts, extension.test.ts
- **Task 11**: `feat(adapter-tui): integrate all components` - src/cli.ts, src/index.ts
- **Task 12**: `chore: remove empty stub adapter packages` - 4 deleted directories
- **Task 13**: `ci: update release workflow to build from adapter-tui` - .github/workflows/release.yml
- **Task 14**: `docs: update README for adapter-tui` - README.md, packages/adapter-tui/README.md

---

## Success Criteria

### Verification Commands
```bash
bun run build                 # Expected: exits 0, no type errors
bun test                      # Expected: all tests pass
bun build --compile --target=bun-linux-x64-baseline packages/adapter-tui/src/cli.ts --outfile dist/kleptowriter-linux-x64
                              # Expected: binary builds successfully
```

### Final Checklist
- [ ] All "Must Have" items implemented
- [ ] All "Must NOT Have" items absent from codebase
- [ ] `bun run build` passes with zero errors
- [ ] `bun test` passes with zero failures
- [ ] Binary compiles and runs → shows project selection → launches TUI
- [ ] Welcome screen shows on startup, disappears on first input
- [ ] All 6 slash commands registered and functional
- [ ] AI tools from adapter-pi work unchanged
- [ ] Stub adapter directories removed
- [ ] README updated with new usage instructions
