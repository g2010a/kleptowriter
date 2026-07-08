# @kleptowriter/adapter-pi

Pi SDK novel writing harness for Kleptowriter. A single-LLM literary assistant
that helps you plan, write, and revise a novel through conversation.

Status: Active development.

## Overview

This adapter integrates Kleptowriter's narrative pipeline with
[Pi SDK](https://pi.dev) as the maintained runtime integration.

Unlike the multi-agent architecture of `kleptowriter-core`, the Pi adapter uses
a **single LLM with custom tools** pattern. The LLM executes the entire
narrative pipeline through conversation, guided by a specialized system prompt
and 9 custom tools.

## Prerequisites

- [Bun](https://bun.sh) 1.2+ for source/development runs
- Anthropic API key (`ANTHROPIC_API_KEY`) or OpenAI API key (`OPENAI_API_KEY`)

Release binaries do not require Bun.

## Quick Start

The workspace (`story/`, `story/scenes/`, `story/bible.json`, `story/.pi-session/`)
is always rooted at your current working directory. Choose how to start based on
where you want the workspace to live:

### Option A: Download a release binary

```bash
chmod +x ./kleptowriter-linux-x64
export ANTHROPIC_API_KEY=sk-ant-...
./kleptowriter-linux-x64
```

Use the binary matching your platform: `darwin-arm64`, `darwin-x64`,
`linux-arm64`, or `linux-x64`.

### Option B: Run from a chosen project directory with Bun

```bash
cd my-novel
bun run /path/to/kleptowriter/packages/adapter-pi/src/cli.ts
```

This creates `my-novel/story/` — the workspace lands exactly where you are.

### Option C: Use the example runner

```bash
cd /path/to/kleptowriter/examples/novel-session
./run.sh              # workspace → examples/novel-session/story/
```

### Option D: Monorepo development (package-root workspace)

```bash
# From the monorepo root:
bun install
export ANTHROPIC_API_KEY=sk-ant-...
bun run --filter @kleptowriter/adapter-pi start
```

**Note:** `bun run --filter` runs the script with cwd at the package root,
so the workspace lands at `packages/adapter-pi/story/`. This is fine for
package development. For a novel project, use Option A or B instead.

Missing an API key? Run without one. The CLI creates the workspace directories
and prints setup instructions, then exits cleanly.

## Building Release Binaries

The repository publishes binaries from tags matching `v*`. To build one locally:

```bash
bun build --compile --target=bun-linux-x64-baseline src/cli.ts --outfile dist/kleptowriter-linux-x64
```

## The Writing Workflow

The AI assistant guides you through four phases:

### 1. Material Ingestion

Talk through your story premise, genre, tone, key characters, and setting. The
AI records everything in the story bible with `update_bible`.

### 2. Interview

The AI asks deeper questions about character motivations, themes, dramatic
tension, and plot arcs. Vague ideas become specific enough to write scenes.

### 3. Scene Loop (default mode)

Scene by scene: plan, compose with `write_scene`, optionally evaluate with
`evaluate_prose`, revise. Use `suggest_next_beat` for ideas on what to write
next. Use `query_bible` to check continuity.

### 4. Revision

After every 3-5 scenes, review pacing, consistency, and character arcs. Run
`deduce_chapters` to see how scenes group into chapters. Results persist to
`story/chapters.yaml`.

You can jump between phases anytime. The AI follows your lead.

## Example Prompts

```
I want to write a literary mystery set in 1920s Cairo.
The main character is Amira, a journalist who uncovers a smuggling ring.
Write the opening scene. Amira is at a train station, waiting for a contact.
```

```
Evaluate the last scene and tell me what to improve.
```

```
What narrative beat should I write next?
```

```
Deduce chapters from what I've written so far.
```

```
How many words have I written? List all scenes.
```

## How It Works

### Scene Files

Scenes are markdown files in `story/scenes/` with YAML frontmatter. IDs follow
the convention `{beat-slug}-{sequence:02d}-{slug}.md`. Beats come from the
narrative template: `setup`, `inciting-incident`, `rising-action`, `climax`,
`falling-action`, `resolution`. Chapters are not in filenames they are deduced
retroactively by `deduce_chapters`.

### Story Bible

`story/bible.json` is the canonical record of characters, locations, plot
threads, and arcs. The AI updates it as you write. Query it with `query_bible`,
update it with `update_bible`.

### Markov Beat Suggestions

`suggest_next_beat` uses a Markov chain trained on the narrative template to
predict the next story beat. It scans existing scenes, identifies your current
position, and returns suggestions with probabilities. Advisory not prescriptive.

### Chapter Deduction

`deduce_chapters` groups written scenes into chapters based on narrative beats
and pacing. It writes `story/chapters.yaml` and is safe to run repeatedly.

### Session Persistence

Conversation state lives in `story/.pi-session/`. On restart, the AI
automatically calls `load_context` to restore the bible and recent scenes. Pick
up where you left off.

## Tools

| Tool | Purpose |
|------|---------|
| `write_scene` | Compose or update a scene document |
| `read_scene` | Retrieve a scene by ID |
| `list_scenes` | List all scenes with titles and word counts |
| `query_bible` | Query story bible (characters, locations, threads) |
| `update_bible` | Add or update a bible entry |
| `evaluate_prose` | Run structured evaluation on a scene |
| `load_context` | Load bible + recent scenes (auto on resume) |
| `suggest_next_beat` | Suggest next narrative beat via Markov analysis |
| `deduce_chapters` | Group scenes into chapters retroactively |

## Package Scripts

```bash
bun run start                    # Start novel writing session
bun run build                    # Typecheck
bun run typecheck                # Typecheck (alias)
```

## Integration Note

The Pi adapter is the maintained integration. Earlier harness stub packages were
removed because they never implemented real runtime behavior.
