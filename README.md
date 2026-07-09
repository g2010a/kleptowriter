# kleptowriter

Novel-writing studio. An interactive TUI harness that wraps Kleptowriter's
narrative pipeline engine with the Pi SDK for a conversational writing
experience.

## Quick start

```bash
bun install
bun run build
bun test

# Start the interactive TUI (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
bun run --filter @kleptowriter/adapter-tui start
```

On first run, you will be prompted to create a project in the current
directory. After that, the TUI opens with a welcome screen and 6 slash commands
to guide your writing.

## Release binaries

Tagged releases build standalone binaries for macOS and Linux:

- `kleptowriter-darwin-arm64`
- `kleptowriter-darwin-x64`
- `kleptowriter-linux-arm64`
- `kleptowriter-linux-x64`

Download the matching file from GitHub Releases, then run it from the directory
where you want your `story/` workspace:

```bash
chmod +x ./kleptowriter-linux-x64
export ANTHROPIC_API_KEY=sk-ant-...
./kleptowriter-linux-x64
```

### macOS Gatekeeper

macOS binaries are ad-hoc signed in CI but not Apple-notarized. If macOS says
"Apple could not verify `kleptowriter-darwin-arm64` is free of malware," either
approve it in System Settings or remove the browser quarantine flag.

Terminal path:

```bash
cd ~/Downloads
chmod +x ./kleptowriter-darwin-arm64
xattr -dr com.apple.quarantine ./kleptowriter-darwin-arm64
export ANTHROPIC_API_KEY=sk-ant-...
./kleptowriter-darwin-arm64
```

GUI path: try opening it once, choose **Done**, then open **System Settings** ->
**Privacy & Security** -> **Open Anyway** for `kleptowriter-darwin-arm64`.

## Interactive TUI

The primary entry point is an interactive terminal UI built on the Pi SDK.
When you start Kleptowriter, you get:

### Welcome screen

A branded header displays the app name and lists all available slash commands.
Press any key to dismiss and enter the conversation.

### Project selection

The adapter detects the project based on the current working directory. Run
Kleptowriter from an empty directory to create a new project — it scaffolds
the workspace (`story/scenes/`, `story/bible.json`, `story/.pi-session/`) and
creates a `.kleptowriter.json` manifest. Run from a directory that already has
`.kleptowriter.json` to open that project directly.

No global registry. Your project is wherever you put it.

### Slash commands

Six built-in commands help you navigate the writing workflow:

| Command | Purpose |
|---------|---------|
| `/interview` | Start a new project interview to establish premise, genre, characters, and setting |
| `/ingest` | Process existing source materials into the project bible |
| `/write` | Enter scene writing mode and draft the next scene |
| `/bible` | Query and display the current state of the story bible |
| `/scenes` | List all written scenes with word counts |
| `/project` | Show current project info |

Type `/hotkeys` for all Pi keyboard shortcuts.

### Multi-provider AI

The TUI uses Pi's built-in `/login` command to authenticate with your AI
provider. Supported providers include Anthropic and OpenAI.

## Packages

| Package | Description |
|---------|-------------|
| `@kleptowriter/kleptowriter-core` | Core narrative pipeline engine -- agents, pipeline, narrative models, context management, evaluation |
| `@kleptowriter/adapter-tui` | Interactive TUI novel writing session -- welcome screen, 6 slash commands, 9 writing tools |
| `@kleptowriter/adapter-pi` | Pi SDK novel writing harness -- 9 custom tools, CLI, release binary entrypoint |

## Architecture

Core engine + TUI wrapper + Pi SDK adapter. The TUI adapter adds an interactive
terminal layer on top of the Pi SDK session, providing cwd-based project detection,
a welcome screen, and slash commands to guide the writing workflow. The Pi
adapter exposes a single-LLM writing assistant with custom tools for material
ingestion, interview, scene generation, evaluation, revision, and chapter
deduction.
