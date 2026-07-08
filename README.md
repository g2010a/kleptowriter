# kleptowriter

Novel-writing harness powered by Kleptowriter core and the Pi SDK adapter.

## Quick start

```
bun install
bun run build
bun test

# Run the Pi SDK novel-writing session (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
cd examples/novel-session && ./run.sh
```

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

GUI path: try opening it once, choose **Done**, then open **System Settings** →
**Privacy & Security** → **Open Anyway** for `kleptowriter-darwin-arm64`.

## Packages

| Package | Description |
|---------|-------------|
| `@kleptowriter/kleptowriter-core` | Core narrative pipeline engine — agents, pipeline, narrative models, context management, evaluation |
| `@kleptowriter/adapter-pi` | Pi SDK novel writing harness — 9 custom tools, CLI, release binary entrypoint |

## Architecture

Core engine + Pi SDK adapter. The Pi adapter exposes a single-LLM writing
assistant with custom tools for material ingestion, interview, scene generation,
evaluation, revision, and chapter deduction.
