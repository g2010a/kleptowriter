# @kleptowriter/adapter-standalone

Standalone CLI harness adapter — runs Kleptowriter as an independent CLI process.

## Exports

- `StandaloneAdapter` (implements `HarnessAdapter`)
- `StandaloneCommand` (`"init" | "run" | "status"`)
- `parseStandaloneCommand(argv?)` — extracts a known command from argv
- `runStandaloneCli(argv?)` — dispatches CLI command (stub)

Status: Stub — CLI integration pending.
