# @kleptowriter/kleptowriter-core

Core narrative pipeline engine for multi-agent story generation.

## Subsystems

- **Pipeline** — orchestrator, interview protocol, scene gates (plan/prose), chapter deduction, bible updates, budget, conflict resolution
- **Agents** — registry, base types, evaluator interfaces (narratologist, pacing analyst, character consistency, thematic coherence, worldbuilding, dialogist, stylesheet, mood-tension curator, fact checker, localizer)
- **Narrative** — Markov inference engine, path predictor, structure guidance, scene planner, narrative templates (12 built-in), constraint checker
- **Context** — sliding window, checkpoint save/load, condensation strategy, tiered memory (hot/warm/cold), budget eviction
- **Eval** — scene extraction, datastore with character-indexed queries, metadata diffing, cross-agent queries, note collection, evaluation reports
- **Data Model** — in-memory story bible (characters, locations, plot threads, knowledge graph, arcs), scene files (markdown frontmatter), chapter assembly
- **Wiki** — page parsing (frontmatter + body), link extraction/replacement, bible population from wiki pages
- **Mailbox** — inter-agent message delivery with session isolation

Exports via barrel: `import { ... } from '@kleptowriter/kleptowriter-core'`

Status: Private, in-development.
