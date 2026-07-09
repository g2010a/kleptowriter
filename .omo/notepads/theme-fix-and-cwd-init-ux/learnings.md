# Learnings

## 2026-07-09 Task: Context-gathering

### Current state
- `packages/adapter-tui/src/cli.ts` — 79 lines, uses `selectProject()` calling `project-manager.ts` (registry-based)
- `packages/adapter-tui/src/project-manager.ts` — 112 lines, full registry CRUD (will be deleted)
- `packages/adapter-tui/src/project-manager.test.ts` — 129 lines, will be deleted
- `packages/adapter-tui/src/cli.test.ts` — 6 tests all mocking `./project-manager.js`
- `packages/adapter-tui/src/extension.ts` — `/project` command mentions switching projects
- `packages/adapter-tui/src/index.ts` — exports session/tools only, no project-manager re-export

### Theme files
- Located in Bun cache: `node_modules/.bun/@earendil-works+pi-coding-agent@0.80.3+c9e75ddbd11a69ea/.../theme/`
- Both `dark.json` (86 lines) and `light.json` (85 lines) have: $schema, name, vars, colors, export sections
- Pi SDK `getPackageDir()` checks `PI_PACKAGE_DIR` env var first (line 295 of config.js)
- `getThemesDir()` for Bun binary returns `join(getPackageDir(), "theme")`

### adapter-pi pattern
- `packages/adapter-pi/src/cli.ts` — cwd-based, no registry, direct workspace setup
- No project selection UI — just works in cwd
- Good reference for cwd-based flow

### Key conventions
- Tests use `bun:test` with `mock.module()` pattern
- `simulateInput()` helper writes to stdin data handler
- Exports use `.js` extension in imports
- Typescript with `tsc --noEmit` for typechecking
