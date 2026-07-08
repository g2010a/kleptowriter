# kleptowriter

Multi-agent narrative generation pipeline.

## Quick start

```
bun install
bun run build
bun test

# Run the Pi SDK novel-writing session (requires PI_API_KEY)
cd examples/novel-session && ./run.sh
```

## Packages

| Package | Description |
|---------|-------------|
| `@kleptowriter/kleptowriter-core` | Core narrative pipeline engine — agents, pipeline, narrative models, context management, evaluation |
| `@kleptowriter/adapter-pi` | Pi SDK novel writing harness — 9 custom tools, CLI, installed from npm |
| `@kleptowriter/adapter-opencode` | OpenCode harness adapter (stub) |
| `@kleptowriter/adapter-codex` | Codex CLI harness adapter (stub) |
| `@kleptowriter/adapter-claude-code` | Claude Code harness adapter (stub) |
| `@kleptowriter/adapter-standalone` | Standalone CLI harness adapter (stub) |

## Architecture

Core engine + harness adapters (Pi SDK adapter is the first real implementation; the others are stubs). The pipeline orchestrates literary agents through material ingestion, interview, scene generation, and revision phases.
