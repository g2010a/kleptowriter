# Start Writing Your Novel in 5 Minutes

Kleptowriter is a novel writing harness powered by the Pi SDK. You talk to an
AI literary assistant that helps you plan, write, and revise scenes. It follows
a four-phase creative workflow and stores everything as files on disk: no
database, no cloud lock-in.

## Prerequisites

- [Bun](https://bun.sh) 1.2+ installed
- An Anthropic API key (`ANTHROPIC_API_KEY`) or OpenAI API key (`OPENAI_API_KEY`)

## Quick Start

```bash
# 1. Install dependencies
cd /workspace/kleptowriter
bun install

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Start writing (from the example directory)
cd examples/novel-session
./run.sh
```

Done. The CLI creates a `story/` workspace in the example directory, checks
for an API key, and starts the Pi session.

The workspace — `story/`, `story/scenes/`, `story/bible.json`,
`story/.pi-session/` — is always rooted at your current working directory.
`./run.sh` preserves the example directory as cwd so the workspace lands at
`examples/novel-session/story/`.

No API key yet? Run without one. The CLI creates the workspace directories and
prints setup instructions, then exits cleanly.

## What Happens Next

The AI assistant guides you through four phases:

1. **Material Ingestion** — You talk through your story premise, genre, tone,
   characters, and setting. The AI records everything in the story bible.

2. **Interview** — The AI asks deeper questions about character motivations,
   themes, dramatic tension, and plot arcs. Everything goes into the bible.

3. **Scene Loop** — You write scenes one at a time. For each scene: discuss the
   plan, use `write_scene` to compose it, optionally evaluate it, and revise
   based on feedback. This is the default writing mode.

4. **Revision** — After a few scenes, step back to review pacing, consistency,
   and character arcs. The AI can deduce chapters from your written scenes.

You can jump between phases at any time. The AI follows your lead.

## Example Prompts to Try

```
I want to write a literary mystery set in 1920s Cairo.
```

```
The main character is Amira, a journalist who uncovers a smuggling ring.
```

```
Let's plan the first scene. Where should it start?
```

```
Write the opening scene. Amira is at a train station, waiting for a contact
who never shows up.
```

```
Evaluate that scene and tell me what to improve.
```

```
What narrative beat should I write next?
```

```
Deduce chapters from what I've written so far.
```

## How It Works

### Scene Files

Every scene is a markdown file in `story/scenes/`. Scene IDs follow this
naming convention:

```
{beat-slug}-{sequence:02d}-{slug}.md
```

Examples: `setup-01-the-stranger-arrives.md`, `rising-action-03-library-race.md`.

Beats come from the narrative template (`setup`, `inciting-incident`,
`rising-action`, `climax`, `falling-action`, `resolution`). The two-digit
sequence orders scenes within a beat. Chapters are not encoded in the filename
they are deduced retroactively.

### Story Bible

`story/bible.json` holds the canonical record of characters, locations, plot
threads, and arcs. The AI updates it automatically when you establish new
details. You can query it with `query_bible` and update it with `update_bible`.

### Markov Beat Suggestions

The `suggest_next_beat` tool uses a Markov chain trained on the narrative
template to suggest what beat to write next. It scans your existing scenes,
identifies your current position in the story structure, and predicts the most
likely next beat with probabilities. Treat it as a creative prompt, not a
directive.

### Chapter Deduction

The `deduce_chapters` tool scans all written scenes and groups them into
chapters based on narrative beats and pacing. Results are stored to
`story/chapters.yaml`. Safe to run repeatedly the AI can revise groupings as
you write more.

### Session Persistence

Your conversation with the AI is saved in `story/.pi-session/`. When you run
the CLI again, the AI calls `load_context` automatically to restore the story
bible and your recent scenes. You pick up right where you left off.

## Tools at a Glance

| Tool | Purpose |
|------|---------|
| `write_scene` | Compose or update a scene document |
| `read_scene` | Retrieve a scene by ID |
| `list_scenes` | List all scenes with titles and word counts |
| `query_bible` | Query the story bible (characters, locations, threads) |
| `update_bible` | Add or update a bible entry |
| `evaluate_prose` | Run structured evaluation on a scene |
| `load_context` | Load bible + recent scenes into context (auto on resume) |
| `suggest_next_beat` | Suggest the next narrative beat via Markov analysis |
| `deduce_chapters` | Group scenes into chapters retroactively |
