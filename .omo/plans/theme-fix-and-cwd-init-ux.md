# Fix Theme Crash + CWD-based Project Init UX

## TL;DR

> **Quick Summary**: Fix the standalone binary crash (Pi SDK theme files not bundled) by embedding theme JSONs and writing to temp dir with `PI_PACKAGE_DIR` override. Then redesign startup: remove the `~/.kleptowriter/projects.json` registry, replace with manifest-based cwd detection (empty dir → prompt to init, non-empty non-project → error, valid project → open).
>
> **Deliverables**:
> - Embedded theme JSONs in adapter-tui (`src/themes.ts`)
> - Temp dir initialization with cleanup in `cli.ts` before `createTuiSession()`
> - New `detectOrInitProject()` function replacing `selectProject()`
> - `.kleptowriter.json` project manifest schema + creation
> - Deleted `project-manager.ts` (registry gone)
> - Updated tests (TDD with bun test)
> - Build script for compiled binary
>
> **Estimated Effort**: Medium (8-12 tasks)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (themes.ts) → Task 3 (temp dir init) → Task 5 (detectOrInitProject) → Task 8 (update main)

---

## Context

### Original Request
The user ran the standalone binary (`kleptowriter-darwin-arm64`) from `~/Downloads/`. It crashed on launch with:
```
ENOENT: no such file or directory, open '/Users/g2010a/Downloads/theme/dark.json'
```
In addition, the user wants to change the startup UX: remove the project registry system and instead detect the current working directory to determine whether to init a project, error, or open directly.

### Interview Summary
**Key Discussions**:
- **Remove ALL registry traces**: No more `~/.kleptowriter/projects.json`. Kleptowriter runs in project directories.
- **Broad OS metadata ignore set**: `.DS_Store`, `Thumbs.db`, `desktop.ini`, `._*`, `__MACOSX/`, `.Spotlight-V100`, `.Trashes`, `.fseventsd`, `ehthumbs.db`, `$RECYCLE.BIN` are ignored when checking "empty".
- **Valid project detection**: Presence of `.kleptowriter.json` manifest file in the cwd.
- **TDD with bun test**: Write tests first for all new logic.

**Research Findings**:
- **Root cause**: Pi SDK `getThemesDir()` for Bun binaries returns `join(dirname(process.execPath), "theme")`. The `dark.json`/`light.json` files live in `node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/` but are NOT bundled in the compiled binary. The `initTheme()` try-catch's fallback to `loadTheme("dark")` ALSO calls `getBuiltinThemes()` → ALSO throws ENOENT — crash is unrecoverable.
- **Fix validated**: Setting `process.env.PI_PACKAGE_DIR` before `createTuiSession()` makes `getPackageDir()` return the override dir. Pi SDK's `getThemesDir()` will look in `<override>/theme/` for the JSON files.
- **adapter-pi reference**: Already uses cwd-based approach (no registry, no project selection). Good pattern for the new UX.
- **No `.kleptowriter.json` manifest** exists anywhere in the codebase.
- **Binary build**: `bun build --compile packages/adapter-tui/src/cli.ts` — currently no script for this.

### Metis Review
**Identified Gaps** (addressed):
- `/project` command needs simplification: now shows current project info only, no switching.
- `.kleptowriter.json` schema: minimal `{ "version": 1, "name": "..." }`.
- Migration: cold turkey — existing registry becomes unused; document in README.
- Temp dir cleanup on SIGINT/SIGTERM.
- Binary build script must be added to `package.json`.

---

## Work Objectives

### Core Objective
Fix the theme path crash in compiled binary AND replace the project registry with cwd-based project detection and initialization.

### Concrete Deliverables
- `packages/adapter-tui/src/themes.ts` — embedded dark/light theme JSON constants
- `packages/adapter-tui/src/cli.ts` — revised: `ensureThemeDir()`, `detectOrInitProject()`, simplified `main()`
- `.kleptowriter.json` project manifest files created on init
- Delete `packages/adapter-tui/src/project-manager.ts` and `project-manager.test.ts`
- Update `packages/adapter-tui/src/cli.test.ts` — new tests for cwd-based flow
- Update `packages/adapter-tui/src/extension.ts` — simplify `/project` command
- Add build script to `packages/adapter-tui/package.json`

### Definition of Done
- [ ] `bun test` passes in adapter-tui (all tests, no failures)
- [ ] Binary compiles: `bun build --compile packages/adapter-tui/src/cli.ts --outfile /tmp/klepto-test`
- [ ] Binary runs without crash from empty dir (shows init prompt)
- [ ] Binary runs without crash from dir with `.kleptowriter.json` (opens TUI directly)
- [ ] Binary errors on non-empty dir without `.kleptowriter.json`

### Must Have
- Pi SDK theme files (dark.json, light.json) available at runtime for compiled binary
- Temp dir with theme files created before `createTuiSession()` is called
- Temp dir cleaned up on SIGINT/SIGTERM/normal exit
- Registry-free startup: no reads/writes to `~/.kleptowriter/projects.json`
- `.kleptowriter.json` created when user says "yes" to init prompt
- OS metadata files (broad set) ignored when checking "is cwd empty?"

### Must NOT Have (Guardrails)
- NO modifications to Pi SDK source code (node_modules or otherwise)
- NO new external dependencies added
- NO project switching in `/project` command (cd + restart is the mechanism)
- NO migration script for existing registry (document in README only)
- NO new test frameworks — use existing `bun:test` patterns
- NO GUI polish or visual changes unrelated to the objectives

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: TDD
- **Framework**: bun test
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Theme fix QA**: Run `bun build --compile`, run binary from temp dir, verify it starts without crash
- **CWD detection QA**: Use `Bun.spawnSync` with the compiled binary in controlled directories
- **Unit tests**: `bun test` — all tests pass

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: themes.ts — embedded theme data [quick]
├── Task 2: OS metadata filter + .kleptowriter.json helpers [quick]
├── Task 3: CLI test setup — mock dirs for cwd detection tests [quick]

Wave 2 (After Wave 1 — core logic):
├── Task 4: ensureThemeDir() + PI_PACKAGE_DIR init [quick]
├── Task 5: detectOrInitProject() — cwd detection + branching [unspecified-high]
├── Task 6: Update main() — wire up new flow, remove registry [unspecified-high]

Wave 3 (After Wave 2 — cleanup + build):
├── Task 7: Simplify /project command in extension.ts [quick]
├── Task 8: Delete project-manager.ts + test file, update README [quick]
├── Task 9: Add build script, verify binary compiles and runs [quick]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 5 → Task 6 → Task 7/8/9 → F1-F4
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix
- **1-3**: — — 4, 5, 6
- **4**: 1 — 6
- **5**: 2, 3 — 6
- **6**: 4, 5 — 7, 8, 9
- **7**: 6 — 9
- **8**: 6 — 9
- **9**: 6, 7, 8 — F1-F4

### Agent Dispatch Summary
- **1**: 3 — T1, T2, T3 → `quick`
- **2**: 3 — T4 → `quick`, T5 → `unspecified-high`, T6 → `unspecified-high`
- **3**: 3 — T7 → `quick`, T8 → `quick`, T9 → `quick`
- **FINAL**: 4 — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. **Create `src/themes.ts` — embedded Pi SDK theme JSON data**

  **What to do**:
  - Create `packages/adapter-tui/src/themes.ts`
  - Export `darkTheme` and `lightTheme` as `const` objects containing the Pi SDK's built-in theme data
  - Copy the EXACT content from:
    - `node_modules/.bun/@earendil-works+pi-coding-agent@0.80.3+c9e75ddbd11a69ea/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json`
    - `node_modules/.bun/@earendil-works+pi-coding-agent@0.80.3+c9e75ddbd11a69ea/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/light.json`
  - Export the schema as typed const objects (use `as const` for literal types)
  - Include the `$schema` URL, `name`, `vars`, `colors`, and `export` sections exactly as-is
  - Add a comment explaining: "Embedded from Pi SDK built-in themes — used as fallback when compiled binary has no filesystem access to theme JSON files."

  **Must NOT do**:
  - Do NOT modify the theme content — must match Pi SDK exactly
  - Do NOT add any theme transformation logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple data extraction and re-export
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: 4 (ensureThemeDir needs theme data)
  - **Blocked By**: None

  **References**:
  - `packages/adapter-tui/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json` — Source to copy
  - `packages/adapter-tui/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/light.json` — Source to copy
  - `packages/adapter-tui/src/extension.ts` — existing pattern for module structure

  **Acceptance Criteria**:
  - [ ] File `src/themes.ts` has `darkTheme` and `lightTheme` as typed const exports
  - [ ] `darkTheme.name === "dark"` and `lightTheme.name === "light"`
  - [ ] All color keys present and match original JSON
  - [ ] `bun test` passes (no failing tests from this change)
  - [ ] `tsc --noEmit` passes with no type errors

  **QA Scenarios**:
  ```
  Scenario: Theme data matches Pi SDK originals
    Tool: Bash
    Preconditions: node_modules installed
    Steps:
      1. Write a small script that imports darkTheme, lightTheme from src/themes.ts
      2. Parse the original dark.json/light.json
      3. Assert deep equality
    Expected Result: All fields match exactly — name, colors, vars, export
    Evidence: .omo/evidence/task-1-theme-equality.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): embed Pi SDK theme JSON data for compiled binary`
  - Files: `packages/adapter-tui/src/themes.ts`

- [x] 2. **Create OS metadata filter + `.kleptowriter.json` helper module**

  **What to do**:
  - Create `packages/adapter-tui/src/project-detect.ts` (new file, no registry, pure detection/init)
  - Add a const array `OS_METADATA_FILES` with the broad ignore set:
    - `.DS_Store`, `Thumbs.db`, `desktop.ini`, `._*`, `__MACOSX/`, `.Spotlight-V100`, `.Trashes`, `.fseventsd`, `ehthumbs.db`, `$RECYCLE.BIN`
  - Implement `isOsMetadataFile(name: string): boolean` — returns true if the filename matches the OS metadata set (use minimatch/glob patterns for `._*`)
  - Implement `isEmptyDir(path: string): Promise<boolean>` — reads dir, filters out OS metadata files, returns true if nothing else remains
  - Implement `isValidProject(path: string): Promise<boolean>` — checks if `.kleptowriter.json` exists and is parseable JSON
  - Implement `initProject(path: string, name: string): Promise<void>` — creates `.kleptowriter.json` with schema: `{ "version": 1, "name": string, "created": ISO-string }`; scaffolds `story/scenes/`, `story/bible.json`, `story/.pi-session/`
  - Implement `readProjectManifest(path: string): Promise<{name: string}>` — reads and parses `.kleptowriter.json`, returns the name
  - Write the file as a PURE module (no side effects, no registry imports)
  - Type the manifest schema: `interface ProjectManifest { version: number; name: string; created: string; }`

  **Must NOT do**:
  - Do NOT import from `./project-manager.js` (will be deleted)
  - Do NOT read or write `~/.kleptowriter/projects.json`
  - Do NOT use any external npm packages for file operations (use `node:fs/promises`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-defined utility functions, no complex logic
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: 5 (detectOrInitProject needs these helpers)
  - **Blocked By**: None

  **References**:
  - `packages/adapter-tui/src/project-manager.ts:59-80` — Current `createProject()` scaffold pattern (story dirs + bible.json)
  - `packages/adapter-tui/src/bible/persistence.ts` — How bible.json is currently loaded/saved

  **Acceptance Criteria**:
  - [ ] `isOsMetadataFile(".DS_Store")` returns `true`
  - [ ] `isOsMetadataFile("story.json")` returns `false`
  - [ ] `isOsMetadataFile("._anything")` returns `true`
  - [ ] `isEmptyDir(tempDir)` returns `true` when only `.DS_Store` is present
  - [ ] `isEmptyDir(tempDir)` returns `false` when a real file is present
  - [ ] `initProject(path, name)` creates `.kleptowriter.json` + `story/scenes/` + `story/bible.json` + `story/.pi-session/`
  - [ ] `isValidProject(path)` returns `true` after `initProject()`
  - [ ] `bun test` passes
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: OS metadata filtering
    Tool: Bash
    Preconditions: Temp dir with .DS_Store, Thumbs.db, and a real file "notes.txt"
    Steps:
      1. Import isEmptyDir
      2. Call with temp dir path
    Expected Result: Returns false (because "notes.txt" is not OS metadata)
    Evidence: .omo/evidence/task-2-os-metadata-filter.txt
  ```
  ```
  Scenario: Init project creates manifest and scaffold
    Tool: Bash
    Preconditions: Empty temp dir
    Steps:
      1. Call initProject(tempDir, "My Novel")
      2. Check .kleptowriter.json exists
      3. Check story/scenes/ exists
      4. Check story/bible.json exists with empty arrays
    Expected Result: All dirs and files created with correct content
    Evidence: .omo/evidence/task-2-init-project.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): add OS metadata filter and .kleptowriter.json helpers`
  - Files: `packages/adapter-tui/src/project-detect.ts`

- [x] 3. **Update cli.test.ts — TDD: write failing tests for new cwd detection flow**

  **What to do**:
  - Update `packages/adapter-tui/src/cli.test.ts`
  - REPLACE all existing tests (which test old registry-based flow) with new tests for the cwd-based flow
  - Mock the new `project-detect.ts` module (not project-manager.ts)
  - Write tests (they'll fail initially — TDD RED phase):
    1. `"empty cwd → shows init prompt, creates project on yes"` — mock `isEmptyDir=true`, `isValidProject=false`, simulate "y" input, verify `initProject` called
    2. `"empty cwd → exits on no"` — mock `isEmptyDir=true`, simulate "n" input, verify exit
    3. `"non-empty non-project cwd → shows error and exits"` — mock `isEmptyDir=false`, `isValidProject=false`, verify error message + exit
    4. `"valid project cwd → opens TUI directly"` — mock `isValidProject=true`, verify `createTuiSession` called with cwd=process.cwd()
    5. `"cwd with only OS metadata → treated as empty → init prompt"` — mock `isEmptyDir=true` even though files exist (test the detection logic)
    6. `"sets up SIGINT handler"` — verify signal handler registered
    7. `"SIGINT cleans up temp dir and exits"` — verify cleanup
  - Follow the existing test pattern (mock stdin/stdout, `simulateInput()`, `Bun.sleep()`)
  - Update the mock at the top to mock `project-detect.js` instead of `project-manager.js`
  - Keep the same `mockStdin`, `mockStdout`, `simulateInput` helper infrastructure
  - The tests will fail initially (RED) — that's expected

  **Must NOT do**:
  - Do NOT keep any tests that reference `project-manager.js` or `selectProject()`
  - Do NOT add any tests for registry-related functionality
  - Do NOT remove the SIGINT handler test (it's still needed)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test-only changes, well-understood patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: 5 (detectOrInitProject implementation needs passing test contract)
  - **Blocked By**: None

  **References**:
  - `packages/adapter-tui/src/cli.test.ts` — Current test file (full rewrite reference)
  - `packages/adapter-tui/src/cli.ts` — The module being tested
  - `packages/adapter-tui/src/project-manager.test.ts` — Pattern for temp dir + filesystem testing

  **Acceptance Criteria**:
  - [ ] All old registry-based tests removed
  - [ ] At least 5 tests for cwd detection flow written
  - [ ] Tests use `mock.module("./project-detect.js")` pattern
  - [ ] Tests fail with expected RED (no implementation yet)
  - [ ] `bun test` still runs without crash (tests fail gracefully)
  - [ ] Test for OS-metadata-only dir treated as empty

  **QA Scenarios**:
  ```
  Scenario: Tests fail as expected (RED phase)
    Tool: Bash
    Preconditions: No detectOrInitProject implementation yet
    Steps:
      1. bun test packages/adapter-tui/src/cli.test.ts
    Expected Result: Tests fail with clear error messages (expected — RED phase of TDD)
    Evidence: .omo/evidence/task-3-red-phase.txt
  ```

  **Commit**: NO (groups with Tasks 5+6 — combined implementation commit)
  - Pre-commit: `bun test packages/adapter-tui/src/cli.test.ts` (expected to fail in RED)

- [x] 4. **Implement `ensureThemeDir()` — temp dir for Pi SDK theme files**

  **What to do**:
  - In `packages/adapter-tui/src/cli.ts`, add an `ensureThemeDir()` function BEFORE the `main()` function
  - Import `darkTheme` and `lightTheme` from `./themes.js`
  - Import `mkdtempSync`, `writeFileSync`, `existsSync`, `mkdirSync` from `node:fs`
  - Import `join` from `node:path`, `tmpdir` from `node:os`
  - Implementation:
    1. Create a temp directory: `mkdtempSync(join(tmpdir(), "kleptowriter-themes-"))`
    2. Create `theme/` subdirectory inside
    3. Write `dark.json` with `JSON.stringify(darkTheme, null, 2)` to `<tempdir>/theme/dark.json`
    4. Write `light.json` with `JSON.stringify(lightTheme, null, 2)` to `<tempdir>/theme/light.json`
    5. Set `process.env.PI_PACKAGE_DIR = tempdir`
    6. Return the temp dir path for cleanup tracking
  - Add a cleanup function:
    1. `cleanupThemeDir(dir: string): void` — uses `rmSync(dir, { recursive: true, force: true })`
    2. Register cleanup handlers for `process.on("SIGINT", ...)`, `process.on("SIGTERM", ...)`, `process.on("exit", ...)`
    3. Cleanup should be idempotent
  - The Pi SDK config.js checks `PI_PACKAGE_DIR` first in `getPackageDir()`, so setting it before `createTuiSession()` will make `getThemesDir()` return `<tempdir>/theme/` where the JSON files exist.
  - Ensure this runs BEFORE any `createTuiSession()` call

  **Must NOT do**:
  - Do NOT use `process.env.PI_PACKAGE_DIR` after cleanup (irrelevant since process exits)
  - Do NOT use long-lived paths (temp dir is ephemeral)
  - Do NOT use async operations for theme file creation (must happen synchronously before session init)
  - Do NOT import or reference `project-manager.js`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small focused function, straightforward implementation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 being complete)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: 6 (main() needs theme dir before createTuiSession)
  - **Blocked By**: 1 (themes.ts)

  **References**:
  - `packages/adapter-tui/node_modules/@earendil-works/pi-coding-agent/dist/config.js:293-313` — `getPackageDir()` shows `PI_PACKAGE_DIR` env var check at line 295
  - `packages/adapter-tui/node_modules/@earendil-works/pi-coding-agent/dist/config.js:320-328` — `getThemesDir()` for Bun binary returns `join(getPackageDir(), "theme")`
  - `packages/adapter-tui/src/cli.ts` — Entry point where env var must be set before createTuiSession call

  **Acceptance Criteria**:
  - [ ] `ensureThemeDir()` creates temp dir with `theme/dark.json` and `theme/light.json`
  - [ ] `process.env.PI_PACKAGE_DIR` is set to the temp dir path
  - [ ] Theme JSON files contain valid JSON matching the Pi SDK originals
  - [ ] Cleanup handler removes temp dir on SIGINT
  - [ ] Cleanup handler removes temp dir on process exit
  - [ ] `bun test` passes
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Temp dir created with correct structure
    Tool: Bash
    Preconditions: None
    Steps:
      1. Write a small test that calls ensureThemeDir()
      2. List files in the returned temp dir path
      3. Read theme/dark.json and theme/light.json
      4. Verify both parse as valid JSON and have correct "name" field
    Expected Result: Temp dir exists with both theme files, process.env.PI_PACKAGE_DIR is set
    Evidence: .omo/evidence/task-4-theme-dir.txt
  ```
  ```
  Scenario: Cleanup on exit
    Tool: Bash
    Preconditions: ensureThemeDir was called
    Steps:
      1. Capture temp dir path
      2. Call cleanupThemeDir()
      3. Check if temp dir still exists
    Expected Result: Temp dir no longer exists
    Evidence: .omo/evidence/task-4-cleanup.txt
  ```

  **Commit**: YES
  - Message: `feat(adapter-tui): ensureThemeDir() with PI_PACKAGE_DIR override for binary`
  - Files: `packages/adapter-tui/src/cli.ts`

- [x] 5. **Implement `detectOrInitProject()` — cwd-based startup flow**

  **What to do**:
  - In `packages/adapter-tui/src/cli.ts`, add a `detectOrInitProject()` function replacing `selectProject()`
  - Implementation:
    1. Get `cwd = process.cwd()`
    2. Check `isValidProject(cwd)` via `./project-detect.js`:
       - If valid: return `{ name, path: cwd }` immediately (no prompts, no registry)
    3. Check `isEmptyDir(cwd)` via `./project-detect.js`:
       - If empty: print current working directory path and ask "This directory is empty. Initialize '{fullPath}' as a Kleptowriter project? (y/N)"
         - On "y"/"yes": prompt for project name (or derive from dir name as default), call `initProject(cwd, name)`, return `{ name, path: cwd }`
         - On anything else: print "Ok, exiting.", process.exit(0)
    4. If not empty and not valid project:
       - Print: "Directory '{fullPath}' already contains files and is not a Kleptowriter project. Please run kleptowriter in an empty directory or inside an existing story directory."
       - `process.exit(1)`
  - Keep the existing `promptLine()` helper (it's already in cli.ts)
  - Keep the `promptLine` for name as-is, but pre-fill with default from dir name (using `basename(cwd)`)
  - Import `isValidProject`, `isEmptyDir`, `initProject`, `readProjectManifest` from `./project-detect.js`

  **Return type**: `Promise<{ name: string; path: string }>` — simple object, not `ProjectInfo` from the deleted module

  **Must NOT do**:
  - Do NOT read or write `~/.kleptowriter/projects.json`
  - Do NOT import from `./project-manager.js`
  - Do NOT show a list of projects (there's no registry)
  - Do NOT prompt for a project path (always cwd)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core UX behavior, needs careful orchestration of prompts, edge cases, and error messages
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 2 and 3)
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: 6 (main() uses detectOrInitProject)
  - **Blocked By**: 2 (project-detect.ts), 3 (test contract for cli.test.ts)

  **References**:
  - `packages/adapter-tui/src/cli.ts:29-55` — Current `selectProject()` being replaced (prompt patterns)
  - `packages/adapter-tui/src/cli.ts:9-25` — Existing `promptLine()` helper
  - `packages/adapter-tui/src/project-detect.ts` — New helper module
  - `packages/adapter-pi/src/cli.ts:76-99` — Reference cwd-based pattern (adapter-pi uses cwd directly)

  **Acceptance Criteria**:
  - [ ] Empty cwd → shows "Initialize '/full/path' as a Kleptowriter project? (y/N)" prompt
  - [ ] "y" input → scaffolds project, returns `{ name, path: cwd }`
  - [ ] Non-"y" input → prints "Ok, exiting." and exits with code 0
  - [ ] Valid project (has `.kleptowriter.json`) → returns `{ name, path: cwd }` with NO prompts
  - [ ] Non-empty, non-project cwd → prints error message and exits with code 1
  - [ ] Cwd with only `.DS_Store` etc → treated as empty, shows init prompt
  - [ ] `bun test` passes (cli.test.ts GREEN phase)
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Valid project opens directly
    Tool: Bash
    Preconditions: Temp dir with .kleptowriter.json created by initProject
    Steps:
      1. Mock process.cwd() to the temp dir
      2. Call detectOrInitProject()
    Expected Result: Returns { name: "...", path: tempDir } without any prompts
    Evidence: .omo/evidence/task-5-valid-project.txt
  ```
  ```
  Scenario: Non-empty non-project errors
    Tool: Bash
    Preconditions: Temp dir with a regular file, no .kleptowriter.json
    Steps:
      1. Mock process.cwd() to the temp dir
      2. Call detectOrInitProject() (should throw/exit)
    Expected Result: Error message printed, process exit 1
    Evidence: .omo/evidence/task-5-non-project-error.txt
  ```

  **Commit**: NO (groups with Tasks 3+6 — combined "cwd-based startup with theme fix and registry removal")
  - Pre-commit: `bun test packages/adapter-tui/src/cli.test.ts`

- [x] 6. **Update `main()` — wire up new flow, remove registry dependencies**

  **What to do**:
  - Rewrite `main()` in `packages/adapter-tui/src/cli.ts`:
    1. Call `ensureThemeDir()` — sets up Pi SDK theme files and `PI_PACKAGE_DIR`
    2. Call `const project = await detectOrInitProject()` — get project context
    3. Create welcome component (unchanged)
    4. Call `createTuiSession({ cwd: project.path, extensionFactories: [...] })` — unchanged signature
    5. SIGINT handler: call `cleanupThemeDir()` then `session.stop()` then `process.exit(0)`
    6. `await session.run()`
  - Remove ALL imports from `./project-manager.js`:
    - Remove `listProjects`, `createProject`, `touchProject`
    - Replace with imports from `./project-detect.js`
  - Keep the self-invocation at the bottom: `if (import.meta.main) { main().catch(console.error); }`
  - Update `promptLine` to accept optional default values (for name prompt with default)
  - Remove the `selectProject()` function entirely

  **Must NOT do**:
  - Do NOT keep any dead code from the old registry-based flow
  - Do NOT import from `./project-manager.js` anywhere
  - Do NOT change the `createTuiSession()` function signature

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Coordinating multiple new functions; updating SIGINT chain to include theme dir cleanup
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: 7, 8, 9
  - **Blocked By**: 4 (ensureThemeDir), 5 (detectOrInitProject)

  **References**:
  - `packages/adapter-tui/src/cli.ts:59-79` — Current `main()` being replaced
  - `packages/adapter-tui/src/cli.test.ts` — Tests that must now turn GREEN

  **Acceptance Criteria**:
  - [ ] `ensureThemeDir()` called before `detectOrInitProject()`
  - [ ] `PI_PACKAGE_DIR` env var set before any Pi SDK theme init
  - [ ] No imports from `./project-manager.js`
  - [ ] SIGINT handler cleans up theme dir
  - [ ] `bun test` passes (cli.test.ts GREEN — all tests pass)
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: New main() flow works end-to-end (unit test)
    Tool: Bash
    Preconditions: Mock project-detect to return valid project
    Steps:
      1. bun test packages/adapter-tui/src/cli.test.ts
    Expected Result: All tests pass (GREEN phase)
    Evidence: .omo/evidence/task-6-green-phase.txt
  ```

  **Commit**: NO (groups with Tasks 3+5 — combined "cwd-based startup with theme fix and registry removal")
  - Pre-commit: `bun test packages/adapter-tui/`

- [x] 7. **Simplify `/project` command in extension.ts**

  **What to do**:
  - In `packages/adapter-tui/src/extension.ts`, update the `/project` command:
    - Change `description` to: "Show current project info (name, path, word count)"
    - Change `guidance` to: "The user wants to see the current project info. Display the project name, directory, word count totals, and scene count. Project switching is done by exiting and running kleptowriter from a different directory."
    - Remove any code/logic that references project switching or registry
  - Update the command list static data only — the Pi SDK extension pattern handles the rest

  **Must NOT do**:
  - Do NOT implement project switching (cd + restart is the mechanism)
  - Do NOT add registry references
  - Do NOT restructure the entire extension — minimal change only

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One-line text changes in static data
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: 9 (build/verification should include all changes)
  - **Blocked By**: 6 (main() with new flow)

  **References**:
  - `packages/adapter-tui/src/extension.ts:42-47` — Current `/project` command definition

  **Acceptance Criteria**:
  - [ ] `/project` command description updated (no "switch projects" language)
  - [ ] Guidance updated to reflect no switching
  - [ ] `bun test` passes
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: /project command no longer mentions switching
    Tool: Bash
    Preconditions: None
    Steps:
      1. Read extension.ts
      2. Search for "switch" or "switching" in the /project command section
    Expected Result: No mention of switching projects in the command
    Evidence: .omo/evidence/task-7-project-command.txt
  ```

  **Commit**: YES
  - Message: `refactor(adapter-tui): simplify /project command, remove switching`
  - Files: `packages/adapter-tui/src/extension.ts`

- [x] 8. **Delete `project-manager.ts` + test, update README**

  **What to do**:
  - Delete `packages/adapter-tui/src/project-manager.ts` — entire file
  - Delete `packages/adapter-tui/src/project-manager.test.ts` — entire file
  - Update `packages/adapter-tui/src/index.ts` — remove `export * from "./project-manager.js"` if present (remove wildcard re-export)
  - Update `packages/adapter-tui/README.md`:
    - Replace "Project selection" section with new cwd-based flow description
    - Remove registry documentation
    - Update quick start to show cwd-based usage
    - Update `/project` command documentation to match simplified behavior
  - Update root `README.md` similarly (cwd-based workflow)
  - Search for any other imports of `project-manager` across the workspace:
    - `grep -r "project-manager" packages/` — remove any remaining references
    - Check `packages/adapter-tui/src/extension.ts` for `/project` command references to registry
  - Ensure no test files still import from `project-manager.js`

  **Must NOT do**:
  - Do NOT leave orphaned imports
  - Do NOT keep any dead code or commented-out references
  - Do NOT change test infrastructure other than removing old tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion, search-and-replace, README updates
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7 — independent changes)
  - **Parallel Group**: Wave 3 (with Tasks 7, 9)
  - **Blocks**: 9 (build/verification)
  - **Blocked By**: 6 (main() rewritten without registry)

  **References**:
  - `packages/adapter-tui/README.md` — Current README with registry docs
  - `packages/adapter-tui/src/index.ts` — Check exports

  **Acceptance Criteria**:
  - [ ] `project-manager.ts` file deleted
  - [ ] `project-manager.test.ts` file deleted
  - [ ] No remaining imports of `./project-manager.js` anywhere in workspace
  - [ ] adapter-tui README updated (no registry docs, cwd-based flow)
  - [ ] Root README updated (cwd-based workflow)
  - [ ] `bun test` passes
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: No project-manager references remain
    Tool: bash (grep)
    Preconditions: Files deleted
    Steps:
      1. grep -r "project-manager" packages/ (excluding node_modules)
    Expected Result: Zero matches
    Evidence: .omo/evidence/task-8-no-registry-refs.txt
  ```

  **Commit**: YES
  - Message: `refactor(adapter-tui): delete project-manager.ts, update README`
  - Files: deleted files, README updates

- [x] 9. **Add binary build script + verify binary compiles and runs**

  **What to do**:
  - Add a `"build:binary"` script to `packages/adapter-tui/package.json`:
    ```json
    "build:binary": "bun build --compile --target=bun-linux-x64-baseline src/cli.ts --outfile dist/kleptowriter-linux-x64"
    ```
  - Add platform-specific scripts for darwin-arm64, darwin-x64, linux-arm64
  - Add a convenience script: `"build:binary:all": "bun run build:binary:linux-x64 && bun run build:binary:linux-arm64 && bun run build:binary:darwin-x64 && bun run build:binary:darwin-arm64"` (but allow it to be optional since cross-compilation may not be available)
  - Add a `"prebuild:binary"` script that runs `tsc --noEmit` first (typecheck before compile)
  - After adding scripts, compile the binary and verify:
    1. `bun run build:binary` succeeds
    2. Run the binary from an empty dir → see init prompt (no crash)
    3. Run the binary from a dir with `.kleptowriter.json` → opens TUI (or connects to LLM if no API key)
  - If LLM key is not set, the TUI should still start and show welcome screen (the theme fix is the objective, not LLM connectivity)

  **Must NOT do**:
  - Do NOT modify the CI release workflow (separate concern — just add the script)
  - Do NOT add `--minify` or `--sourcemap` flags unless explicitly asked
  - Do NOT bundle the binary as a release artifact in the repo

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package.json script addition, one-time build verification
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: F1-F4 (final verification needs a working binary)
  - **Blocked By**: 6 (main() with theme fix and new flow), 7 (extension), 8 (deleted registry)

  **References**:
  - `.github/workflows/release.yml:54-55` — CI binary build commands (reference for correct flags)
  - `packages/adapter-tui/package.json` — Scripts section
  - `packages/adapter-pi/package.json:12-14` — Reference for package.json structure

  **Acceptance Criteria**:
  - [ ] `build:binary` script added to package.json
  - [ ] `bun run build:binary` succeeds (binary created in `dist/`)
  - [ ] Binary runs without crash from empty directory (shows init prompt)
  - [ ] Binary runs without crash from directory with `.kleptowriter.json`
  - [ ] Binary errors gracefully from non-empty non-project directory
  - [ ] `bun test` still passes after script addition
  - [ ] `tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Binary builds successfully
    Tool: Bash
    Preconditions: bun build --compile available
    Steps:
      1. cd packages/adapter-tui
      2. bun run build:binary
    Expected Result: Binary created at dist/kleptowriter-linux-x64, exit code 0
    Evidence: .omo/evidence/task-9-binary-build.txt
  ```
  ```
  Scenario: Binary runs without theme crash from empty dir
    Tool: Bash (interactive_bash for TUI binary)
    Preconditions: Binary exists, temp empty dir
    Steps:
      1. cd /tmp/test-empty-dir
      2. Run the binary with timeout (5 seconds)
      3. Check output for init prompt
    Expected Result: Shows "This directory is empty. Initialize '/tmp/test-empty-dir' as a Kleptowriter project?" — no ENOENT crash
    Evidence: .omo/evidence/task-9-binary-run.txt
  ```

  **Commit**: YES
  - Message: `chore(adapter-tui): add build script, verify binary compiles`
  - Files: `packages/adapter-tui/package.json`
  - Pre-commit: `bun test packages/adapter-tui/`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files in `.omo/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun test` and `tsc --noEmit`. Review all changed files for: type suppression, empty catches, debug logging, unused imports, AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Build binary with `bun build --compile`. Run from: empty dir, dir with .kleptowriter.json, non-empty dir without manifest, dir with only .DS_Store. Verify correct behavior in each case.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 delivery. Check "Must NOT do" compliance. No scope creep.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **1**: `feat(adapter-tui): embed Pi SDK theme JSON data for compiled binary`
- **2**: `feat(adapter-tui): add OS metadata filter and .kleptowriter.json helpers`
- **3+5+6**: `feat(adapter-tui): cwd-based startup with theme fix and registry removal`
  Groups: test scaffolding + detectOrInitProject + main() rewrite — logically atomic
- **4**: `feat(adapter-tui): ensureThemeDir() with PI_PACKAGE_DIR override`
- **7**: `refactor(adapter-tui): simplify /project command, remove switching`
- **8**: `refactor(adapter-tui): delete project-manager.ts, update README`
- **9**: `chore(adapter-tui): add build script, verify binary compiles`

---

## Success Criteria

### Verification Commands
```bash
cd packages/adapter-tui && bun test    # All tests pass
bun build --compile packages/adapter-tui/src/cli.ts --outfile /tmp/klepto-test  # Binary builds
/tmp/klepto-test                       # Runs from empty dir (prints init prompt, no crash)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Binary builds and runs without crash
