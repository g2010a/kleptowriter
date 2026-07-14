# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-07-14

### Added
- **In-session upgrade notification** — Migration warnings now appear via `ctx.ui.notify()` in the TUI message area (near the input line) instead of lost in terminal scrollback
- **`/version-upgrade` slash command** — Run schema migrations in-situ with `loadAndMigrate` and automatic write-back to disk
- **`PI_SKIP_VERSION_CHECK` suppression** — Pi SDK update warnings are suppressed in the TUI to reduce noise

### Fixed
- **Startup version check visibility** — Moved `runStartupCheck` from `session.ts` to `cli.ts` so console output is visible before the TUI takes over the terminal
- **400 errors on `/scenes` and `/metadata`** — Added `ctx.model` guard in slash command handlers; shows a warning notification instead of crashing with a raw 400 when no AI provider is configured

### Changed
- **Dependency** — Bumped `@earendil-works/pi-coding-agent` from 0.80.3 to 0.80.6

## [0.3.0] - 2026-07-13

### Added
- **Stylometry analysis** — Added stylometry profiling to `write_scene` tool with system prompt updates for prose fingerprinting
- **5 new evaluators** — Expanded `SceneProseGate` and `ScenePlanGate` with five new evaluator implementations for deeper scene quality checks
- **Web fetch tool** — Added `web_fetch` tool to TUI adapter and extended `suggest_next_beat` loop for research-assisted writing
- **Heroine's Journey template** — Added new narrative template following the Heroine's Journey structure for character-driven stories
- **Integration tests** — Added full scene workflow integration tests covering the complete writing pipeline

### Fixed
- **PI_PACKAGE_DIR hijack** — Fixed adapter-tui incorrectly hijacking `PI_PACKAGE_DIR` environment variable which broke `/export` command