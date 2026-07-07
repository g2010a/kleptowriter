# Issues — Kleptowriter Pi SDK Harness

## Known Gotchas
- Pi SDK `@earendil-works/pi-coding-agent` is not yet installed — Task 1 will validate
- InMemoryStoryBible uses Maps which JSON.stringify can't serialize directly — need custom serialize/deserialize
- `verbatimModuleSyntax: true` + `moduleResolution: "Bundler"` means exports use `.js` extension in source (e.g. `export * from "./tools/types.js"`) — the bundler resolves it to the `.ts` source
- SceneProseGate.evaluate() takes SceneDocument + StoryBible (which is an interface, not concrete class)
- `rootDir` in package tsconfig blocks type-only imports from workspace packages — remove it for `tsc --noEmit` packages that need cross-package type imports

## Task 5 Issues
- Pi SDK `defineTool()` return type inference: when execute has try/catch with different return shapes, TypeScript infers TDetails from the first branch. Must use `as` casts or match shapes exactly.
- `eval-tools.ts` type errors from Task 5: `SceneExtractor` not exported from core barrel (fixed in Task 7 via subpath import) and return type mismatch on evaluate_prose (fixed in Task 7 via single-return-point pattern).
- **Version double-increment bug (fixed)**: `update_bible` called `applyStateUpdate` then `saveBible` called it again. Returned stale version. Fix: `saveBible` owns increment, `update_bible` returns `_bible.version` after save.

## Task 7 Issues
- `Bun.file()` does not follow `process.cwd()` patches — scene file tests must write to real CWD paths.
- `SceneExtractor` not in core barrel — must import from `@kleptowriter/kleptowriter-core/eval/extractor.js` subpath.
- Pi SDK defineTool union-type issue: error/success branches with different field types create incompatible union. Single return point with mutable variables is the clean fix.
- `NoteCollector` and `AgentNote` not in core barrel — must import from `@kleptowriter/kleptowriter-core/eval/notes.js` subpath.
- Initial implementation returned `notes: []` without using NoteCollector — manual review caught the gap. Prose gate FAIL findings are the natural source for notes.

## Task 9 Issues
- **Lexicographic beat ordering bug (fixed)**: `loadSceneBeats()` sorted filenames alphabetically and took the last as current beat. `inciting-incident-*` sorts before `setup-*` alphabetically, so a workspace with setup then inciting-incident incorrectly reported `setup` as current. Fix: parse scene IDs into `{beat, sequence}`, rank by template `structure.beats` index then sequence number. Regression test added.

## Task 11 Issues
- **Auth artifact leak (fixed)**: `DefaultResourceLoader` + `createAgentSession` without explicit `AuthStorage` writes `auth.json` to `agentDir`. Tests using `.omo/.pi-agent` left generated auth files in working tree. Fix: tests use `mkdtemp()` for `agentDir`, `afterEach` cleanup via `rm -rf`.
- **Greeting requires API key check**: `session.prompt()` throws without credentials. `startNovelSession()` must check `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` before sending greeting; skip silently when absent.

## Task 12 Issues
- **Session persistence with dummy API key**: When running with a dummy API key (`sk-ant-test-...`), `DefaultResourceLoader` writes `auth.json` to the session dir. The CLI's `SIGINT` handler unsubscribes + disposes, but disposal while a dummy session is mid-init may log a non-fatal error. This is acceptable — the dummy-key flow is for init testing only; real usage requires a valid key.
- **Pi SDK event text shape uncertain**: The `onEvent` handler checks a few known event types for text content (`type: "text"`, `type: "message"`/`"assistant_message"` with content arrays). Additional event shapes may carry text — add them when the TUI is enhanced.
- **SIGINT double-invocation guard**: Needed a `shuttingDown` flag because `process.exit(0)` in the async handler may not prevent a second SIGINT during dispose. Standard pattern for clean shutdown.
