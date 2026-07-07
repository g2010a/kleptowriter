# Decisions — Kleptowriter Pi SDK Harness

## 2026-07-07 Architecture Decisions

### Adapter Pattern
- Pi adapter does NOT implement the existing HarnessAdapter interface (different pattern: single-LLM-via-tools vs multi-agent-via-registry)
- New pattern documented and intentional per Metis review

### Scene ID Format
- Semantic hierarchical naming: `{beat-slug}-{sequence:02d}-{slug}.md`
- Uses narrative beats (setup, inciting-incident, rising-action, climax, falling-action, resolution)
- NOT act/chapter numbers — those are deduced retroactively by ChapterDeductor

### Serialization
- InMemoryStoryBible stores Maps — serialize to plain objects for bible.json
- Atomic file writes: write to .tmp file, then rename to target
- Bible version increments on each save

### Pi Tool Format
- All tools use `defineTool()` from Pi SDK with TypeBox schemas
- Return Pi-compatible `{ content: [...], details: {} }` format

### Dependency Strategy
- Pin Pi SDK version in package.json
- No additional dependencies beyond what Pi SDK brings
