# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-07-13

### Added
- **Stylometry analysis** — Added stylometry profiling to `write_scene` tool with system prompt updates for prose fingerprinting
- **5 new evaluators** — Expanded `SceneProseGate` and `ScenePlanGate` with five new evaluator implementations for deeper scene quality checks
- **Web fetch tool** — Added `web_fetch` tool to TUI adapter and extended `suggest_next_beat` loop for research-assisted writing
- **Heroine's Journey template** — Added new narrative template following the Heroine's Journey structure for character-driven stories
- **Integration tests** — Added full scene workflow integration tests covering the complete writing pipeline

### Fixed
- **PI_PACKAGE_DIR hijack** — Fixed adapter-tui incorrectly hijacking `PI_PACKAGE_DIR` environment variable which broke `/export` command