# Decisions - Kleptowriter Implementation

## Architecture Decisions
- Scenes are flat atoms: `story/scenes/scene-001.md`. No act/chapter hierarchy.
- Wiki is truth, Bible is cache: Wiki on disk is single durable source.
- Markov + constraints: Position-based beats replaced by transition probabilities + 5 constraint types.
- Dual gates: Scene Plan Gate (cheap) → Writer writes → Prose Gate (expensive).
- Chapters deduced retroactively via ChapterDeductor.
- yWriter7 patterns: Scene status (0-4), soft deletion, word count, custom fields.
