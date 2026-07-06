# kleptowriter

Multi-agent narrative generation pipeline.

## Quick start

```
bun install
bun run build
bun test
bun run examples/basic-pipeline.ts
```

## Packages

| Package | Description |
|---------|-------------|
| `@kleptowriter/kleptowriter-core` | Core narrative pipeline engine — agents, pipeline, narrative models, context management, evaluation |
| `@kleptowriter/adapter-opencode` | OpenCode harness adapter (stub) |
| `@kleptowriter/adapter-codex` | Codex CLI harness adapter (stub) |
| `@kleptowriter/adapter-claude-code` | Claude Code harness adapter (stub) |
| `@kleptowriter/adapter-standalone` | Standalone CLI harness adapter (stub) |

## Architecture

Core engine + 4 harness adapters. The pipeline orchestrates literary agents through material ingestion, interview, scene generation, and revision phases.
