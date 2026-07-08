# @kleptowriter/adapter-tui

Interactive TUI novel writing session for Kleptowriter. A terminal-based
writing studio with project management, slash commands, and a conversational AI
writing assistant.

## Prerequisites

- [Bun](https://bun.sh) 1.2+ for source/development runs
- Anthropic API key (`ANTHROPIC_API_KEY`) or OpenAI API key (`OPENAI_API_KEY`)

Release binaries do not require Bun.

## Quick start

From the monorepo root:

```bash
bun install
export ANTHROPIC_API_KEY=sk-ant-...
bun run --filter @kleptowriter/adapter-tui start
```

Missing an API key? Run without one. The TUI starts, prompts you to create or
select a project, then shows the welcome screen. Pi's built-in `/login` command
lets you authenticate with your provider from inside the session.

## What you see

### 1. Project selection

On your first launch, you are asked for a project name and path. The adapter
scaffolds the workspace (`story/scenes/`, `story/bible.json`,
`story/.pi-session/`) and registers the project in `~/.kleptowriter/projects.json`.

On subsequent launches, you see a numbered list of existing projects. Pick one
or choose to create a new one.

### 2. Welcome screen

After selecting a project, a branded header displays:

```
╔══════════════════════════════════════════════════╗
║           Kleptowriter -- Novel Writing Studio    ║
╚══════════════════════════════════════════════════╝

Welcome! Here's how to get started:

  /interview   Start a new greenfield project interview
  /ingest      Process existing materials into the bible
  /write       Enter scene writing mode
  /bible       View or edit the story bible
  /scenes      List all scenes with word counts
  /project     Create, open, or switch projects

Type any message or command to begin.
```

Press any key to dismiss the welcome screen and enter the conversation.

### 3. Slash commands

Six built-in slash commands map to common writing phases:

| Command | Purpose |
|---------|---------|
| `/interview` | Start the interview phase to establish premise, genre, characters, and setting |
| `/ingest` | Begin material ingestion to feed source material into the project bible |
| `/write` | Enter scene writing mode to draft the next scene |
| `/bible` | Query the project bible and present its current state |
| `/scenes` | List all written scenes with their word counts |
| `/project` | Show current project info; pass a name to switch projects |

### 4. AI conversation

Once the welcome screen is dismissed, you are in a conversational AI session
powered by Pi SDK. The AI has access to all 9 Kleptowriter writing tools and
can guide you through the full novel-writing workflow.

Type `/hotkeys` for all Pi keyboard shortcuts. Type `/login` to switch AI
providers mid-session.

## The writing workflow

The AI assistant guides you through four phases:

### 1. Material ingestion

Talk through your story premise, genre, tone, key characters, and setting. The
AI records everything in the story bible with `update_bible`.

### 2. Interview

The AI asks deeper questions about character motivations, themes, dramatic
tension, and plot arcs. Vague ideas become specific enough to write scenes.

### 3. Scene loop (default mode)

Scene by scene: plan, compose with `write_scene`, optionally evaluate with
`evaluate_prose`, revise. Use `suggest_next_beat` for ideas on what to write
next. Use `query_bible` to check continuity.

### 4. Revision

After every 3-5 scenes, review pacing, consistency, and character arcs. Run
`deduce_chapters` to see how scenes group into chapters. Results persist to
`story/chapters.yaml`.

You can jump between phases anytime. The AI follows your lead.

## Example prompts

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

## Tools

The AI has access to 9 writing tools from `@kleptowriter/kleptowriter-core`:

| Tool | Purpose |
|------|---------|
| `write_scene` | Compose or update a scene document |
| `read_scene` | Retrieve a scene by ID |
| `list_scenes` | List all scenes with titles and word counts |
| `query_bible` | Query story bible (characters, locations, threads) |
| `update_bible` | Add or update a bible entry |
| `evaluate_prose` | Run structured evaluation on a scene |
| `load_context` | Load bible and recent scenes (auto on resume) |
| `suggest_next_beat` | Suggest next narrative beat via Markov analysis |
| `deduce_chapters` | Group scenes into chapters retroactively |

## How it works

### Scene files

Scenes are markdown files in `story/scenes/` with YAML frontmatter. IDs follow
the convention `{beat-slug}-{sequence:02d}-{slug}.md`. Beats come from the
narrative template: `setup`, `inciting-incident`, `rising-action`, `climax`,
`falling-action`, `resolution`. Chapters are not in filenames -- they are
deduced retroactively by `deduce_chapters`.

### Story bible

`story/bible.json` is the canonical record of characters, locations, plot
threads, and arcs. The AI updates it as you write. Query it with `query_bible`,
update it with `update_bible`.

### Session persistence

Conversation state lives in `story/.pi-session/`. On restart, the AI
automatically calls `load_context` to restore the bible and recent scenes. Pick
up where you left off.

### Project registry

Projects are registered in `~/.kleptowriter/projects.json`. The TUI lists them
on startup so you can switch between projects without leaving the terminal.

## Package scripts

```bash
bun run start       # Start TUI novel writing session
bun run build       # Typecheck
bun run typecheck   # Typecheck (alias)
```
