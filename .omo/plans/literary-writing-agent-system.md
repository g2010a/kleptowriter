# Literary Writing Agent System — Architecture Blueprint

## TL;DR

> **Quick Summary**: A harness-agnostic, TypeScript-based literary writing agent system inspired by oh-my-openagent. Defines 17 specialized agents (16 writing/evaluation agents + 1 organizing Archivist) that process user material, interview, plan, write, and evaluate fiction through a hard-gated pipeline.
>
> **Core Innovation**: Agents communicate via a mailbox protocol (modeled after oh-my-openagent's Team Mode). A **Markov chain + constraint system** drives narrative structure guidance — beats transition with weighted probabilities, long-range dependencies are enforced through declarative constraints (ordering, occurrence, distance, reference). Scene metadata extraction (characters, locations, POV, tension, purpose, chronology, mood, items, plot threads, questions, thematic motifs) feeds every agent's analysis.
>
> **Pipeline**: Phase 0 (Material Ingestion — user dumps raw notes into `raw-inputs/`, Archivist processes into an LLM-maintained wiki → extracts Story Bible) → Interview (with wiki pre-loaded) → Per-scene loop: Markov generates Scene Plan → agents gate plan → Writer writes prose → agents gate prose → Bible sync + chapter deduction → Revision loop.
>
> **Deliverable**: Architecture blueprint — interfaces, data model, agent contracts, protocol, and adapter surfaces for OpenCode, Codex CLI, Claude Code, and standalone operation.

---

## Context

### Original Request
Build a system of AI agents for literary writing, following oh-my-openagent's architectural patterns (agent factories, model fallback chains, mailbox communication, multi-harness adapters). The system should replicate creative writing personas and entertainment media roles, loop until writing is done, enforce narrative structure integrity (Hero's Journey via user's fWriter project), extract scene metadata for cross-agent evaluation, and operate as a plugin for any agent harness.

### Interview Summary
**Key Decisions**:
- **Harness Strategy**: Harness-agnostic core library first (pure TypeScript). OpenCode/Codex/Claude Code adapters later.
- **Pipeline**: Pre-loop interview phase → Per-scene loop: Markov generates Scene Plan → agents gate plan → Writer generates prose → agents gate prose → Bible sync + chapter deduction. Chapters are deduced retroactively from scene clusters.
- **f-writer**: Replace it. Agents define their own data model (Markdown + YAML frontmatter).
- **Model Strategy**: Abstract model capability tiers (e.g., `prose-gen-tier-1`, `analysis-tier-1`) — concrete model mapping done at deployment.
- **Narrative Structures**: Plugin architecture. 12 initial implementations: Hero's Journey, Freytag's Pyramid, Horror-Tension, Jo-Ha-Kyu, Kishotenketsu, Mystery Thriller, Rasa Theory, Romance Beat Sheet, Save the Cat, Seven Point, Story Circle, Three Act.
- **Agent Roster**: 16 agents, all in scope from day 1.
- **Scene Metadata**: Characters, locations, POV, tension level, scene purpose, chronology, mood, key items, plot threads advanced, questions answered/raised, thematic motifs.
- **Evaluation Gates**: Hard gates — all relevant agents must approve before progression.
- **Output Format**: Markdown prose with YAML frontmatter for metadata.

**Research Findings**:
- oh-my-openagent provides: `AgentFactory` pattern (`createXXXAgent(model) → AgentConfig`), `AGENT_MODEL_REQUIREMENTS` fallback chains, 5-tier hook system, mailbox-communication Team Mode, multi-edition adapter architecture, core package extraction pattern.
- PostWriter (avigold): Plan → 3-5 draft variants → 5 hard validators + 10 soft critics → revise. Manuscript as 4 layers: text, story-state, stylistic, analytical.
- StoryWeaver (serendipity-engine): 8-phase pipeline, 24 genres, 14 voice tones, relationship graph, QC audit across 10 dimensions.
- alt-code-ai fiction-writing skill: McKee, Egri, Truby, Schechter, Snyder, Vogler/Campbell synthesis — premise-driven, scene-based.
- story-skills (danjdewhurst): Markdown + YAML frontmatter story projects with CLI validation, continuity checks, character/plot registration.
- Spec Kit fiction-book-writing preset: 26 AI commands, 21 templates, constitution-driven governance.
- User's fWriter project: YAML narrative structure definitions for 12+ templates with per-beat metadata (tension, character milestones, thematic requirements).

### Metis Review

Metis identified 4 critical gaps in the initial design. All are addressed in the sections below.

| Gap | Severity | Resolution |
|-----|----------|------------|
| **No Story Bible / World Model** | 🔴 Critical | Added §1.4 — shared persistent state all agents read/write. Characters, locations, items, timeline, arc state, knowledge graph. |
| **No iteration budget or "good enough" criteria** | 🔴 Critical | Added §6.3 — per-scene revision cap (default 5), "good enough" thresholds per evaluator, cost-aware circuit breakers, escalation to human if ceiling exceeded. |
| **No context management strategy** | 🟡 Major | Added §10 — sliding context window, summary condensation, tiered memory (hot/warm/cold), checkpoint compression. |
| **No conflict resolution protocol** | 🔴 Critical | Added §6.4 — escalation ladder, weighted voting, lead-agent tiebreaker, human-in-the-loop override. |

A 5th gap was identified during post-interview refinement and resolved in v1.4:

| Gap | Severity | Resolution |
|-----|----------|------------|
| **No raw material ingestion or wiki** | 🟡 Major | Added §1.5 — Phase 0 (Material Ingestion): user dumps into `raw-inputs/`, Archivist processes into interlinked wiki, Story Bible extracted deterministically. Archivist added as Agent 17. |

A 6th issue was identified during blueprint review and resolved in v1.5:

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Wiki vs Bible data duplication** (two separate stores for the same knowledge) | 🟡 Major | Bible is now an in-memory cache only, populated from the wiki on startup. Wiki is the single durable source of truth (§1.4-1.5). `story/bible/` directory eliminated. No file-level duplication. |

### Post-Blueprint Refinement: Markov Chain Structure Guidance

After architecture review, the user requested replacing the fixed-percentage-position beat model with a **variable-order Markov chain + declarative constraint system**:

| Change | Impact |
|--------|--------|
| Position-based beats (`min`/`max`/`ideal` percentages) removed | Beats now define transition probabilities, not positions |
| Added `transitions` to beat definitions | Each beat specifies weighted probabilities for next beats |
| Added `constraints` section to structure YAML | Declarative rules for ordering, occurrence, distance, and reference constraints |
| Position becomes derived (emergent) | Computed from `completedBeats / totalExpectedBeats` |
| New interface `MarkovStructureGuidance` | Replaces `NarrativeStructurePlugin` for beat-level queries |
| `tension_curve` and `pacing` kept as-is | These are global story properties, not position-dependent |
| **Pipeline redesigned** — Markov generates Scene Plans, agents gate plans first, Writer writes only after plan approval, chapters deduced retroactively (§6) | Pipeline is now: Interview → Markov plan → plan gate → prose → prose gate → Bible sync + chapter deduction. Two gates per scene, first gate is cheap (no prose). |

---

## Work Objectives

### Core Objective
Define a complete, harness-agnostic architecture for a multi-agent literary writing system that can produce novel-length fiction through structured phases, with hard quality gates at every level of abstraction.

### Concrete Deliverables
- **Data model**: Story project structure (Markdown + YAML frontmatter)
- **Agent definitions**: 16 agents with role descriptions, capability tiers, and communication contracts
- **Narrative structure plugin interface**: How beat templates plug in
- **Scene evaluation protocol**: Extraction, datastore, cross-agent queries
- **Interview protocol**: How the author-agent extracts a story
- **Scene Plan generation**: Markov chain → Scene Plan (parameters without prose)
- **Scene Plan Gate**: How agents evaluate plans before writing (cheap evaluation)
- **Chapter deduction**: Retroactive chapter clustering from scene sequence
- **Writing pipeline**: Phase flow with dual gates (plan gate + prose gate)
- **Agent communication protocol**: Message types, mailbox system, session isolation
- **Harness adapter interfaces**: Plugin surface for OpenCode, Codex, Claude Code, standalone
- **Model capability tiers**: Abstract tiers mapping to agent needs

### Must Have
- All 16 agents defined with clear responsibilities and boundaries
- Hard-gate evaluation at every pipeline level
- Narrative structure plugin system with multi-template support
- **Markov chain + constraint system** for structural guidance (not fixed-position percentages)
- Variable-order Markov chains (1st-order base, higher-order where beats require history)
- Declarative constraint system for long-range dependencies (ordering, occurrence, distance, reference)
- Scene-level metadata extraction driving agent evaluations
- Harness-agnostic core design (no harness-specific code in core)
- Agent-to-agent communication protocol
- Pre-loop interview protocol with satisfaction criteria
- Abstract model capability tiers (not hardcoded model names)

### Must NOT Have (Guardrails)
- No fixed-percentage-position beat model (e.g., "beat X at 40-55%") — position is emergent from Markov chain
- No concrete model names in core architecture (capability tiers only)
- No harness-specific plugin code in the core library
- No GUI/UI layer in the core
- No one-shot generation assumption — system is looping by design
- No "writer replacement" framing — the system augments, not replaces
- No real LLM API calls in the blueprint — this is a design document
- No requirement for the user's private fWriter repo content — YAML structure interface is defined generically

### Spec Framework Integration
N/A — This is a new project design, not extending an existing spec-driven repo.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  LITERARY WRITING SYSTEM CORE               │
│  (Harness-Agnostic TypeScript Library)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
 │  ┌─────────────────────────────────────────────────────┐    │
 │  │                 STORY DATA MODEL                     │    │
 │  │  (Flat scene files + YAML frontmatter + Wiki)        │    │
 │  │  Scenes → Chapters (by reference) → Novel            │    │
 │  │  Characters / Locations / Timeline / Items / Arc     │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │               AGENT SYSTEM                           │    │
│  │  16 specialized agents + Mailbox Communication        │    │
│  │  Writer | Editor | Critic | Ideator | Researcher     │    │
│  │  Fact-Checker | Localizer | Narratologist            │    │
│  │  Pacing Analyst | Character Consistency              │    │
│  │  Thematic Coherence | World-building | Dialogist     │    │
│  │  Stylesheet | Mood/Tension Curator                   │    │
│  │  Narrative Consistency                               │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │            PIPELINE ORCHESTRATOR                     │    │
│  │  Phase 1: Interview (Author-Agent)                   │    │
│  │  Phase 2: Writing Loop (Chapter→Scene→Prose)         │    │
│  │  Phase 3: Revision (Scene-level iteration)           │    │
│  │  Hard Gates between phases                           │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │          NARRATIVE STRUCTURE PLUGINS                 │    │
│  │  Hero's Journey | Freytag | Kishotenketsu | ...     │    │
│  │  Each: beat definitions, tension curves, milestones  │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │           MODEL CAPABILITY TIERS                     │    │
│  │  prose-gen | analysis | research | creativity | ...  │    │
│  │  Fallback chains per agent (abstract)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                  HARNESS ADAPTER LAYER                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ OpenCode │  │  Codex   │  │ClaudeCode│  │Standalone│    │
│  │  Plugin  │  │  Plugin  │  │  Plugin  │  │   CLI    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Story Data Model

The story is the central data structure. All agents read from and write to it. The format is Markdown + YAML frontmatter — human-readable, diffable, git-friendly.

### 1.1 Project Root

```
my-novel/
├── raw-inputs/                  # User dumps disorganized material here
│   ├── notes.txt                # Stream-of-consciousness notes
│   ├── scene-draft-1.md         # Partially written scene
│   ├── character-sketch-sarah.md
│   ├── research-article.pdf
│   └── ...                      # Any format, any organization
├── story.yaml                   # Project manifest
├── story/
│   ├── wiki/                    # LLM-maintained wiki — single source of truth
│   │   ├── index.md             # Page catalog with summaries
│   │   ├── log.md               # Append-only change log
│   │   ├── characters/          # One page per character
│   │   │   ├── sarah-chen.md
│   │   │   └── dr-morales.md
│   │   ├── locations/           # One page per location
│   │   ├── concepts/            # Themes, technology, magic systems
│   │   ├── plot/                # Plot threads, story arcs
│   │   ├── research/            # Factual research, references
│   │   └── scenes/              # Partial drafts, scene ideas (Phase 0 only)
│   ├── scenes/                  # Flat scene files — the atomic unit
│   │   ├── scene-001.md
│   │   ├── scene-002.md
│   │   └── ...
│   ├── chapters.yaml            # Chapter definitions — thin, references scenes
│   ├── premise.md               # Premise, controlling idea
│   └── outline.md               # Chapter-by-chapter outline
└── evaluations/                 # Cross-cutting evaluation artifacts
    ├── character-consistency.yaml
    ├── pacing-report.yaml
    └── ...
```

### 1.2 Scene File Format

Each scene is a Markdown file with YAML frontmatter:

```yaml
---
id: scene-001
title: "The Discovery"

# Scene Metadata (written by scene evaluator after drafting)
metadata:
  pov: "Sarah Chen"
  characters:
    present: ["Sarah Chen", "Dr. Morales"]
    introduced: ["Dr. Morales"]
  locations: ["MIT NanoLab", "Sarah's Apartment"]
  chronology:
    start: "2026-03-15T09:00:00"
    end: "2026-03-15T23:30:00"
    duration: "14h 30m"
    timeline_order: 3
  tension:
    start_level: 4
    end_level: 7
    peak_level: 8
    curve: "rising"
  mood: ["anticipation", "awe", "dread"]
  purpose: "Inciting Incident — the discovery that changes everything"
  key_items:
    - name: "Quantum Anomaly Dataset"
      significance: "Contains proof of non-local information transfer"
      first_mentioned: true
  plot_threads:
    advanced: ["quantum-discovery", "sarah-career-crisis"]
    introduced: ["government-surveillance"]
    resolved: []
  questions:
    raised: ["What does the anomaly mean?", "Who else knows?"]
    answered: ["Why Sarah was recruited to MIT"]
  thematic_motifs: ["knowledge-as-burden", "science-vs-ethics"]

# Narrative Structure Mapping (from Markov chain guidance)
narrative_position:
  structure: "hero-journey"
  beat: "call-to-adventure"
  previous_beat: "ordinary-world"
  transition_probability: 0.72          # Markov chain probability for this transition
  surprise: 0.28                        # 0-1: how unexpected this transition was
  beat_tension: 6                       # Expected tension from beat definition
  actual_tension: 8                     # From metadata above
  deviation: +2                         # actual vs expected tension
  constraint_issues: []                 # constraint violations triggered by this scene

# Evaluation Results (populated by agent evaluations)
evaluations:
  continuity:
    status: "pass"
    issues: []
  character_consistency:
    status: "pass"
    issues: []
  pacing:
    status: "pass"  
    metrics:
      word_count: 2450
      dialogue_ratio: 0.35
      scene_duration_minutes: 870
  narratology:
    status: "conditional_pass"
    issues:
      - severity: "minor"
        agent: "Narratologist"
        note: "Inciting incident lands well, but the 'refusal' beat could be strengthened with clearer stakes"
  ## ... other agent evaluations
---

# Scene Prose

Sarah Chen stared at the monitor, her coffee growing cold beside her...

[Scene content continues in Markdown...]
```

#### 1.2.1 Scene Status (yWriter7 Pattern)

Adopted from yWriter7, each scene carries a `status` field tracking its completion:

| Code | Label | Meaning |
|------|-------|---------|
| 0 | Outline | Placeholder scene, no prose yet |
| 1 | Rough | First pass, unpolished |
| 2 | Draft | Revised, structurally sound |
| 3 | Revised | Line-edited, nearly final |
| 4 | Done | Approved by gate agents |

Scenes can also be marked `unused: true` for soft deletion (the yWriter7 trash pattern).

#### 1.2.2 Design Inspiration: yWriter7 Data Model

yWriter7 is a battle-tested novel-writing tool whose XML schema validates against ~20 years of real use. Key patterns adopted and improved:

**Adopted from yWriter7:**

| Pattern | yWriter7 Implementation | Our Adaptation |
|---------|------------------------|----------------|
| **Scene as atomic unit** | Flat `<SCENES>` list. Chapters reference scenes by `<ID>`. | Flat scene files in `story/scenes/`, chapters reference by string ID. |
| **Chapter = thin container** | Title, description, sort order, `<ScID>` list. No scene content in chapter. | `chapters.yaml` with scene ID arrays. No scene files inside chapters. |
| **Soft deletion** | `<Unused>-1</Unused>` flag + trash chapter type. | `unused: true` flag on scene frontmatter. |
| **Per-scene status** | `<Status>1-4</Status>`. | Same — `status: 0-4` (see §1.2.1). |
| **Cross-references** | Scenes reference character/location/item IDs. | YAML lists of string IDs in scene frontmatter. |
| **Extensible custom fields** | Field1-Field4 per scene (commonly POV, goal, conflict, outcome). | `customFields: Record<string, string>`. |
| **Word count tracking** | WordCount + LetterCount per scene. | Auto-tracked on save. |
| **Separate entity stores** | Characters, locations, items as separate XML sections. | Wiki pages per entity type with structured YAML frontmatter. |

**Improved vs yWriter7:**

| Limitation | Our Improvement |
|------------|----------------|
| Opaque numeric IDs (ID=1) | Human-readable string IDs: `scene-001`, `sarah-chen`. |
| All content in single XML blob | Per-scene markdown files, git-friendly and human-editable. |
| Only title + desc + 4 custom fields | Rich YAML frontmatter: POV, chronology, tension, mood, plot threads, dramatic questions. |
| No quality gates | Multi-agent evaluation pipeline at every stage. |
| No structural guidance | Markov chain + constraint system for narrative guidance. |
| No automated analysis | Dedicated agents for character consistency, pacing, thematic tracking. |

#### 1.2.3 Chapter Assembly (Retroactive, Scene-Referenced)

Chapters are NOT directories in the filesystem. They live in a single `story/chapters.yaml` that defines chapters by referencing scene IDs. This matches yWriter7's model: chapters are thin containers, scenes are independent atoms.

```yaml
# story/chapters.yaml
chapters:
  - id: ch-01
    title: "The Jaguar-Man Made of Mud"
    description: "Prometheus struggles to find an identity when he gains consciousness."
    sort_order: 1
    scenes:
      - scene-001

  - id: ch-02
    title: "Victoria"
    description: "Victoria teases what this is about."
    sort_order: 2
    scenes:
      - scene-002
      - scene-003

  - id: ch-03
    title: "Leaving Home"
    description: "Pressed by her parents, Victoria goes to the University."
    sort_order: 3
    scenes: []  # Placeholder — scenes not yet written
```

Chapters are assembled **retroactively** by the ChapterDeductor, which scans the scene sequence for natural breaks:

```typescript
interface ChapterAssembly {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  scenes: string[];                 // Ordered scene IDs
  type: "normal" | "trash";
}

interface ChapterDeductor {
  deduce(scenes: SceneDocument[], context: StoryContext): ChapterCandidate[];
  finalize(candidates: ChapterCandidate[], edits: ChapterEdit[]): ChapterAssembly[];
}

interface ChapterCandidate {
  scenes: string[];
  confidence: number;               // How strong is the break evidence
  breakReason: string;              // POV change | time jump | location shift | ...
}
```

Break heuristics:
- **POV change** across 2+ scenes = strong break
- **>24h time jump** = moderate break
- **Location shift** across 3+ scenes = moderate break
- **Tension climax → relief** = weak break
- **Plot thread resolves** = strong break
- **Every 3-6 scenes** = soft hint (reader breath)

### 1.3 Character File Format

```yaml
---
id: sarah-chen
name: "Sarah Chen"
role: protagonist
physiology:
  age: 32
  appearance: "Petite, sharp features, perpetually tired eyes"
  health: "Healthy but sleep-deprived"
sociology:
  class: "Upper-middle"
  education: "PhD Physics, MIT"
  occupation: "Research Scientist, MIT Quantum Lab"
  relationships:
    - target: "dr-morales"
      type: "mentor"
      dynamics: "Respectful but strained by differing ethics"
    - target: "agent-renee"
      type: "antagonistic"
      dynamics: "Trust eroded by government interference"
psychology:
  drives: ["Truth at any cost", "Prove her theory correct"]
  fears: ["Being wrong publicly", "Losing academic freedom"]
  contradiction: "Brilliant in lab, naive about politics"
  arc:
    type: "positive"
    starting_flaw: "Believes truth always wins"
    ending_growth: "Learns truth must be strategically deployed"
voice:
  speech_pattern: "Precise, technical terms, code-switches when nervous"
  internal_monologue: "Analytical, self-critical, occasionally poetic"
---
```

---

### 1.4 In-Memory Story Bible (Cache)

> **Design refinement**: The Story Bible is the system's shared in-memory cache. It is **not persisted to disk as separate files**. The wiki (§1.5) is the single source of truth on disk. The Bible is populated from the wiki on load and updated incrementally as scenes complete. This eliminates data duplication: the wiki has the canonical markdown, the Bible has the structured TypeScript view.

The Story Bible is the system's shared runtime memory. Every agent can read from it; only designated agents write to specific sections. It is populated on startup by extracting structured data from wiki pages (YAML frontmatter + prose), and kept incrementally updated through agent `state_update` messages.

```typescript
interface StoryBible {
  version: number;                       // Incremented on each write
  lastUpdated: string;                   // ISO 8601

  // Core entities
  characters: Map<string, CharacterState>;
  locations: Map<string, LocationState>;
  items: Map<string, ItemState>;

  // Timeline
  chronology: TimelineEntry[];

  // Narrative state
  arcs: ArcTracker[];
  plotThreads: PlotThread[];
  dramaticQuestions: DramaticQuestion[];

  // Knowledge graph (who knows what, when they learned it)
  knowledgeState: KnowledgeGraph;

  // Thematic state
  thematicProgression: ThematicProgression;
}

// Character state is a live snapshot updated after every scene
interface CharacterState {
  id: string;
  name: string;
  status: "active" | "off-stage" | "introduced" | "departed";
  currentLocation: string;
  currentScene_ knowledgeState: CharacterKnowledge;  // What this character knows
  arcProgress: number;                     // 0.0-1.0 — how far along their arc
  relationshipDeltas: Array<{              // Changes per scene
    with: string;                          // Other character ID
    change: "improved" | "worsened" | "complicated" | "revealed";
    sceneId: string;
    note: string;
  }>;
  voiceConsistency: {                      // Tracked by Dialogist / Stylesheet
    lastChecked: string;
    deviationCount: number;
    flags: string[];
  };
}

// Knowledge graph tracks what each character knows and when
interface KnowledgeGraph {
  edges: Array<{
    from: string;                          // Character ID
    fact: string;                          // e.g., "government-surveillance-exists"
    learnedAt: string;                     // Scene ID
    confidence: "certain" | "suspected" | "unaware";
  }>;
  // Query: would Character X know fact Y at this point?
  knows(characterId: string, fact: string, afterSceneId: string): boolean;
}

// Plot thread tracking
interface PlotThread {
  id: string;
  name: string;
  status: "open" | "active" | "resolved" | "abandoned";
  introducedIn: string;                    // Scene ID
  lastAdvancedIn: string;
  promiseToReader: string;                 // What payoff the reader expects
  scenesInvolved: string[];
  agentNotes: Array<{
    agentId: string;
    note: string;
    severity: "continuity" | "pacing" | "thematic";
  }>;
}

// Dramatic questions the story has raised
interface DramaticQuestion {
  question: string;
  raisedIn: string;                        // Scene ID
  answeredIn?: string;
  importance: "central" | "subplot" | "incidental";
  status: "open" | "partially-answered" | "answered";
}

// Arc tracker — character and plot arcs
interface ArcTracker {
  id: string;
  type: "character" | "relationship" | "plot" | "thematic";
  targetId: string;                        // Character ID or plot thread ID
  expectedBeats: string[];                 // Expected milestone beats
  completedBeats: string[];
  currentPhase: string;
  progress: number;                        // 0.0-1.0
}
```

#### Bible Write Ownership

| Section | Write Agents | Read Agents |
|---------|-------------|-------------|
| Characters → state | Character Consistency | All evaluators |
| Characters → voice | Dialogist, Stylesheet | Character Consistency |
| Locations | World-building | All |
| Items | World-building | All |
| Timeline → facts | Fact-Checker | Narrative Consistency |
| Plot threads | Narrative Consistency | All |
| Dramatic questions | Critic, Narrative Consistency | All |
| Knowledge graph | Character Consistency | Fact-Checker, Narrative Consistency |
| Thematic progression | Thematic Coherence | Critic |

#### Bible Update Protocol

After every scene evaluation, a **Bible Sync** step runs:
1. Collect state updates from agents (via mailbox `state_update` messages)
2. Merge into the in-memory Bible (conflict resolution: last-writer-wins per field)
3. Increment version number
4. Broadcast `bible_updated` event to all agents
5. Agents reference the Bible for their next evaluation; the wiki is not modified by this step

### 1.5 Wiki: Single Source of Truth

> **Single source of truth**: The wiki at `story/wiki/` is the ONLY durable knowledge store. The Story Bible (§1.4) is an in-memory cache derived from it. No parallel `story/bible/` directory exists. No data duplication. No sync risk.

The wiki follows the Karpathy LLM-wiki pattern — a collection of interlinked markdown pages that is entirely LLM-maintained. The Archivist (Organizing Agent) creates, updates, interlinks, and maintains all pages. The user reads the wiki but never writes it.

During Phase 0 (Material Ingestion), the user dumps raw material into `raw-inputs/`, and the Archivist processes it into the wiki:

#### 1.5.1 Raw Inputs

`raw-inputs/` is the user's dumping ground. Any format, any organization:

```
raw-inputs/
├── notes.txt                   # Stream of consciousness
├── scene-draft-1.md            # Partial scene, rough prose
├── sarah-backstory.md          # Character notes
├── research-quantum-physics.pdf
├── image-reference.jpg         # Visual reference
├── dialogue-snippet.txt
└── outline-on-napkin.txt       # Whatever the user has
```

The user is prompted at project start: *"Put all your material in `raw-inputs/` before proceeding. Notes, drafts, research, images — anything. The system will process it all."*

#### 1.5.2 Wiki Format (Karpathy-style)

The wiki lives at `story/wiki/`. It is entirely LLM-maintained — the Organizing Agent creates, updates, interlinks, and maintains all pages. The user reads the wiki but never writes it.

```
story/wiki/
├── index.md                    # Page catalog — every page listed with link + summary
├── log.md                      # Append-only change log — what changed and when
├── characters/                 # One page per character
│   ├── sarah-chen.md
│   └── dr-morales.md
├── locations/                  # One page per location
├── concepts/                   # Themes, technology, magic systems, lore
├── plot/                       # Plot threads, story arcs, dramatic questions
├── research/                   # Factual research, references, sources
└── scenes/                     # Partial drafts, scene ideas, alternate versions
```

Each wiki page is markdown with optional YAML frontmatter:

```markdown
---
type: character
name: Sarah Chen
aliases: ["Dr. Chen", "Sarah"]
tags: [protagonist, scientist, mit]
related_pages: [location/mit-nanolab, character/dr-morales, concept/quantum-anomaly]
---

# Sarah Chen

Dr. Sarah Chen is a research scientist at the MIT Quantum Lab.

## Background
Born in [location], Sarah showed early aptitude for physics...

## Personality
- **Drives**: Truth at any cost, prove her theory correct
- **Fears**: Being wrong publicly, losing academic freedom
- **Contradiction**: Brilliant in lab, naive about politics

## Relationships
- **[[Dr. Morales]]** — mentor, relationship strained by differing ethics
- **[[Agent Renee]]** — government agent, antagonistic

## Arc
- **Flaw**: Believes truth always wins
- **Growth**: Learns truth must be strategically deployed
- **Current**: In [[scenes/the-discovery]], unaware of the conspiracy

## Notes
Any additional observations from raw material or interview.
```

#### 1.5.3 Wiki → In-Memory Bible Population

The in-memory Story Bible (§1.4) is populated from the wiki on startup via deterministic extraction. This is NOT a file-to-file sync — it reads wiki markdown pages and populates the in-memory cache:

```typescript
interface WikiToBiblePopulation {
  // Populate the in-memory Bible from wiki pages
  populate(wiki: WikiDirectory, bible: StoryBible): PopulationReport;

  // Per-entity extraction from wiki page content + YAML frontmatter
  extractCharacter(page: WikiPage): CharacterState;
  extractLocation(page: WikiPage): LocationState;
  extractPlotThread(page: WikiPage): PlotThread;
}

interface PopulationReport {
  entitiesCreated: number;
  entitiesUpdated: number;
  warnings: string[];            // e.g., "Character page missing required fields"
  unresolvedLinks: string[];     // Wiki links with no target page
}
```

The mapping is:

| Wiki Page Type | Bible Entity | Extraction |
|---------------|-------------|------------|
| `type: character` + prose | `CharacterState` | YAML frontmatter + prose extraction |
| `type: location` + prose | `LocationState` | YAML frontmatter + prose extraction |
| `type: plot` + prose | `PlotThread` | Narrative summary → thread state |
| `type: concept` + prose | Glossary entry | Definition extraction |
| Timeline info across pages | `TimelineEntry` | Chronological mentions across wiki |
| `type: scene` + prose | Scene metadata | Partial scene analysis + metadata |

The Bible is populated once at startup and kept incrementally updated via agent `state_update` messages after each scene completes. A full re-population from the wiki is triggered only when the wiki changes (user edits/adds a page).

---

## 2. Agent Architecture

### 2.1 Agent Interface

Patterned after oh-my-openagent's `AgentFactory`:

```typescript
// Core agent interface (harness-agnostic)
interface LiteraryAgent {
  readonly id: string;
  readonly role: AgentRole;
  readonly capabilityTier: CapabilityTier;
  readonly mode: "primary" | "subagent" | "all";

  // Each agent can evaluate, generate, or both
  canEvaluate(): boolean;
  canGenerate(): boolean;

  // Every agent receives the story context
  setStoryContext(context: StoryContext): void;
}

// Agent factory pattern
type LiteraryAgentFactory = (config: AgentConfig) => LiteraryAgent;

// Model capability tier (abstract — concrete models mapped at deployment)
interface CapabilityTier {
  id: string;
  requirements: {
    reasoning: "low" | "medium" | "high" | "very-high";
    creativity: "low" | "medium" | "high" | "very-high";
    contextWindow: "small" | "medium" | "large" | "very-large";
    specializedKnowledge?: string[];
  };
  fallbackChain: Array<{
    tier: string;  // Next tier to degrade to
    condition: string;  // e.g., "provider-unavailable" | "cost-optimization"
  }>;
}
```

### 2.2 The 16 Agents

Each agent defined with: role, responsibilities, capability tier requirements, evaluation criteria, and communication patterns.

| # | Agent | Primary Role | Capability Needs | Operates In | Evaluates | Generates |
|--:|-------|-------------|-----------------|-------------|-----------|-----------|
| 1 | **Writer** | Draft prose for scenes | prose-gen (very-high creativity, very-large context) | Phases 2b-3 | — | ✅ Scenes |
| 2 | **Editor** | Line-level editing: grammar, spelling, word choice, sentence flow | prose-analysis (high reasoning) | Phases 2b-3 | ✅ Scene prose | ✅ Edits |
| 3 | **Critic** | Holistic assessment of scene quality, engagement, reader impact | analysis (very-high reasoning) | Phases 1-3 | ✅ Scenes, arcs | ✅ Reports |
| 4 | **Ideator** | Generate creative concepts, plot twists, character ideas | creativity (very-high creativity) | Phases 1, 2a | — | ✅ Ideas |
| 5 | **Researcher** | Find information to ground the story | research (high reasoning, web access) | Phase 0, 3 | ✅ Factual accuracy | ✅ Research notes |
| 6 | **Fact-Checker** | Verify internal and external consistency of facts | analysis (very-high reasoning, detail-oriented) | Phases 2b-3 | ✅ Facts, timeline, references | ✅ Reports |
| 7 | **Localizer** | Adapt content for cultural/language/regional accuracy | cultural-knowledge (medium-high reasoning) | Phases 2b-3 | ✅ Cultural details | ✅ Localization notes |
| 8 | **Narratologist** | Enforce narrative structure integrity (beat tracking, structural analysis) | structural-analysis (high reasoning) | Phases 1-3 | ✅ Beats, structure | ✅ Structural reports |
| 9 | **Pacing Analyst** | Evaluate tension curves, scene duration, information density | pacing-analysis (high reasoning) | Phases 1-3 | ✅ Pacing metrics | ✅ Pacing reports |
| 10 | **Character Consistency** | Track character voice, behavior, knowledge state across scenes | character-analysis (high reasoning, large context) | Phases 1-3 | ✅ Character continuity | ✅ Character state updates |
| 11 | **Thematic Coherence** | Ensure every scene serves the controlling idea/premise | thematic-analysis (high reasoning) | Phases 1-3 | ✅ Thematic alignment | ✅ Theme reports |
| 12 | **World-building** | Track lore, setting rules, internal consistency of story world | world-analysis (medium reasoning, large knowledge) | Phases 1-3 | ✅ World rules, lore | ✅ World state updates |
| 13 | **Dialogist** | Evaluate and improve dialogue — naturalness, subtext, character voice | dialogue-analysis (high reasoning) | Phases 2b-3 | ✅ Dialogue quality | ✅ Dialogue rewrites |
| 14 | **Stylesheet** | Enforce stylistic parameters (voice, POV, tense, tone, register) | style-analysis (medium-high reasoning) | Phases 1-3 | ✅ Style compliance | ✅ Style corrections |
| 15 | **Mood/Tension Curator** | Map emotional arc across scenes — tension, relief, mood shifts | emotional-analysis (medium reasoning) | Phases 1-3 | ✅ Emotional arc | ✅ Mood annotations |
| 16 | **Narrative Consistency** | Global consistency: plot threads, promises/payoffs, dramatic questions | global-analysis (very-high reasoning, very-large context) | Phases 1-3 | ✅ Plot coherence | ✅ Consistency reports |
| 17 | **Archivist (Organizing Agent)** | Process raw inputs → maintain wiki → extract Bible | comprehension-analysis (medium reasoning, broad knowledge) | Phase 0 only | ✅ Raw material coverage | ✅ Wiki pages, Bible entities |

> **Note**: The Archivist (agent 17) operates exclusively in Phase 0 (Material Ingestion). It does not participate in the writing pipeline. All other agents (1-16) participate in the writing and evaluation phases.

### 2.3 Agent Communication Protocol

Patterned after oh-my-openagent's Team Mode mailbox system:

```typescript
// Message types in the mailbox protocol
type AgentMessageType =
  | "evaluation_request"     // Agent A asks Agent B to evaluate something
  | "evaluation_response"    // Agent B returns evaluation
  | "generation_request"     // Agent A asks Agent B to generate content
  | "generation_response"    // Agent B returns generated content
  | "information_query"      // Agent A asks Agent B for data/facts
  | "information_response"   // Agent B returns data
  | "flag"                   // Agent flags an issue (non-blocking)
  | "approval_request"       // Agent requests gate passage
  | "approval_decision"      // Agent approves/rejects with reasons
  | "broadcast"              // One-to-many notification
  | "state_update";          // Agent broadcasts state change

interface AgentMessage {
  id: string;
  type: AgentMessageType;
  from: string;          // Agent ID
  to: string | "*";      // Recipient or broadcast
  correlationId?: string; // For request/response pairing
  body: unknown;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: string;     // ISO 8601
  context: {
    sceneId?: string;
    chapterId?: string;
    evaluationId?: string;
  };
}

// Mailbox interface
interface AgentMailbox {
  send(message: AgentMessage): Promise<void>;
  receive(agentId: string, options?: {
    type?: AgentMessageType;
    since?: string;       // ISO 8601 timestamp
    correlationId?: string;
  }): AsyncIterable<AgentMessage>;
  getUnreadCount(agentId: string): Promise<number>;
  markRead(messageId: string): Promise<void>;
}
```

---

## 3. Narrative Structure Plugin System (Markov Chain Model)

> **Design Decision**: Replaced fixed-percentage-position beats with a variable-order Markov chain + declarative constraint system. Beat positions are no longer specified in YAML — they emerge from transition probabilities. Long-range narrative dependencies (e.g., "clue planted in act 1 must pay off in act 3") are enforced through declarative constraints, not position targets.

### 3.1 Plugin Data Model (YAML)

Narrative structure plugins define beats as Markov chain states with weighted transitions, plus a constraint system for long-range dependencies:

```yaml
# Example: romance-beat-sheet.yaml
id: romance-beat-sheet
name: Romance Beat Sheet
author: Romance Writers of America / Industry Standard
source: "Various romance writing guides"
category: genre
version: "2.0"
genres:
  - romance
  - romantic comedy
  - romantic suspense

description: |
  The essential beats for romance novels, emphasizing the emotional 
  journey of two characters falling in love.

order: 1                         # Markov chain order (default: 1)

beats:
  - id: meet-cute
    name: Meet Cute / First Meeting
    description: The protagonists meet for the first time (or reunite)
    purpose: Establish chemistry and initial dynamic (often antagonistic)
    examples:
      - "Enemies meet at a wedding"
      - "Childhood friends reunite"
    tension: 4
    is_major: true
    can_be: first                # Can be the opening beat
    transitions:                 # Weighted next-beat probabilities
      - to: tension-rising
        weight: 0.6
      - to: subplot-introduction
        weight: 0.2
      - to: complication
        weight: 0.15
      - to: first-kiss           # Rare, direct skip
        weight: 0.05
        note: "Only if enemies-to-lovers subgenre"

  - id: first-kiss
    name: First Kiss / Major Romantic Milestone
    description: A significant romantic moment
    purpose: Physical manifestation of emotional connection
    tension: 8
    is_major: true
    transitions:
      - to: relationship-deepening
        weight: 0.5
      - to: complication
        weight: 0.3
      - to: black-moment
        weight: 0.2

  - id: black-moment
    name: Black Moment / Dark Night
    description: The relationship is tested to its breaking point
    purpose: Lowest emotional point before resolution
    tension: 3
    is_major: true
    transitions:
      - to: grand-gesture
        weight: 0.7
      - to: external-conflict-climax
        weight: 0.2
      - to: breakup          # Bad ending branch
        weight: 0.05

  - id: grand-gesture
    name: Grand Gesture / Climax
    description: One protagonist makes a grand romantic gesture
    purpose: Emotional catharsis and theme affirmation
    tension: 9
    is_major: true
    transitions:
      - to: hea-ending
        weight: 0.8
      - to: epilogue
        weight: 0.15
      - to: bittersweet-ending
        weight: 0.05

  - id: hea-ending
    name: Happily Ever After
    description: The couple is together and committed
    purpose: Satisfying emotional resolution
    tension: 5
    is_major: false
    transitions: []             # Terminal state (no outgoing transitions)

# Declarative constraint system for long-range dependencies
constraints:
  ordering:
    - id: meet-cute-before-first-kiss
      type: "order"
      before: "first-kiss"
      after: "meet-cute"
      severity: "critical"      # Violating this = structural failure
      reason: "First Kiss must occur after the protagonists meet"

    - id: climax-final
      type: "order"
      before: null               # Must be last (before terminal states)
      after: "black-moment"
      severity: "critical"
      reason: "Grand Gesture / Climax must follow the Black Moment"

  occurrence:
    - id: meet-cute-once
      type: "count"
      beat: "meet-cute"
      min: 1
      max: 1
      severity: "critical"

    - id: complications-range
      type: "count"
      beat: "complication"
      min: 2
      max: 5
      severity: "major"

  distance:
    - id: meet-cute-to-first-kiss-spacing
      type: "scene_distance"
      from: "meet-cute"
      to: "first-kiss"
      min_scenes: 3
      max_scenes: 15
      severity: "major"
      reason: "Too soon = rushed, too late = reader frustration"

    - id: black-moment-to-resolution
      type: "scene_distance"
      from: "black-moment"
      to: "grand-gesture"
      min_scenes: 1
      max_scenes: 3
      severity: "minor"
      reason: "Readers need the dark moment fresh for catharsis"

  reference:
    - id: setup-payoff-chekhov
      type: "reference"
      setup_pattern: "item-introduced"
      payoff_pattern: "item-used"
      description: "Any item introduced (e.g., a letter, a weapon) must be used or referenced later"
      severity: "minor"
      scope: "story"            # Check entire story, not just adjacent scenes

  tension:
    - id: post-black-moment-respite
      type: "tension_ceiling"
      after_beat: "black-moment"
      max_tension: 4
      duration_scenes: 2        # Must stay low for at least 2 scenes
      severity: "major"

tension_curve:
  type: smooth
  points:
    - progress: 0.0             # Now references story progress (beats completed / total), not fixed position
      tension: 4
      label: Meet Cute
    - progress: 0.5
      tension: 8
      label: First Kiss
    - progress: 0.75
      tension: 3
      label: Black Moment
    - progress: 1.0
      tension: 5
      label: HEA

pacing:
  scene_count_range:
    min: 40
    max: 80
    ideal: 55

  act_distribution:
    - act: "Meeting & Setup"
      percentage: 25
    - act: "Falling in Love"
      percentage: 25
    - act: "Complications"
      percentage: 25
    - act: "Resolution"
      percentage: 25
```

### 3.2 Plugin Interface (TypeScript)

#### Markov Chain + Constraint Engine

```typescript
// ============================================================
// YAML-DERIVED TYPES (serialized from .yaml files)
// ============================================================

interface NarrativeStructureDefinition {
  id: string;
  name: string;
  author?: string;
  source?: string;
  category: string;
  version: string;
  genres?: string[];
  description: string;
  order: number;                        // Markov chain order (1 = 1st-order, 2 = 2nd-order, etc.)
  beats: NarrativeBeatDef[];
  constraints: ConstraintDef[];
  tension_curve: TensionCurveDef;
  pacing: PacingDef;
}

interface NarrativeBeatDef {
  id: string;
  name: string;
  description: string;
  purpose: string;
  examples?: string[];
  tension: number;                      // 1-10 expected tension
  is_major: boolean;
  can_be?: "first" | "last" | "any";   // Role in the structure
  transitions: BeatTransition[];        // Weighted next-beat probabilities (replaces `position`)
}

interface BeatTransition {
  to: string;                           // Target beat ID
  weight: number;                       // 0.0-1.0 (normalized with siblings)
  condition?: string;                   // Optional narrative condition (evaluated at runtime)
  note?: string;                        // Human-readable explanation
}

// ============================================================
// CONSTRAINT SYSTEM
// ============================================================

type ConstraintDef = OrderConstraintDef | CountConstraintDef 
                   | DistanceConstraintDef | ReferenceConstraintDef 
                   | TensionConstraintDef;

interface OrderConstraintDef {
  id: string;
  type: "order";
  before: string | null;                // beat ID that must come after, or null = must be last
  after: string | null;                 // beat ID that must come before, or null = must be first
  severity: "critical" | "major" | "minor";
  reason: string;
}

interface CountConstraintDef {
  id: string;
  type: "count";
  beat: string;                         // Beat ID
  min: number;
  max: number;
  severity: "critical" | "major" | "minor";
}

interface DistanceConstraintDef {
  id: string;
  type: "scene_distance";
  from: string;
  to: string;
  min_scenes?: number;
  max_scenes?: number;
  severity: "critical" | "major" | "minor";
  reason: string;
}

interface ReferenceConstraintDef {
  id: string;
  type: "reference";
  setup_pattern: string;                // e.g., "item-introduced", "question-raised"
  payoff_pattern: string;               // e.g., "item-used", "question-answered"
  description: string;
  severity: "critical" | "major" | "minor";
  scope: "chapter" | "act" | "story";
}

interface TensionConstraintDef {
  id: string;
  type: "tension_ceiling";
  after_beat: string;
  max_tension: number;                  // 1-10
  duration_scenes: number;
  severity: "critical" | "major" | "minor";
}

// Constraint violation at runtime
interface ConstraintViolation {
  constraintId: string;
  type: ConstraintDef["type"];
  severity: "critical" | "major" | "minor";
  description: string;
  context: {
    currentBeat?: string;
    sceneIds?: string[];
    relevantBeats?: string[];
  };
}

// ============================================================
// TENSION CURVE & PACING (unchanged from position model)
// ============================================================

interface TensionCurveDef {
  type: "smooth" | "step" | "sawtooth";
  points: Array<{
    progress: number;                   // Story progress 0.0-1.0 (emergent from completed beats)
    tension: number;                    // 1-10
    label: string;
  }>;
}

interface PacingDef {
  scene_count_range: { min: number; max: number; ideal: number; };
  act_distribution: Array<{ act: string; percentage: number; }>;
  scene_type_guidance: Array<{
    range: string;                     // e.g., "0-25"
    types: Record<string, number>;
  }>;
}

// ============================================================
// MARKOV CHAIN GUIDANCE — replaces position-based queries
// ============================================================

// Narrative state: what the system knows at a given point
interface NarrativeState {
  currentBeat: string;                  // Last completed beat ID
  history: string[];                    // Sequence of completed beat IDs (for higher-order)
  completedScenes: number;
  totalEstimatedScenes: number;         // From pacing.scene_count_range.ideal
  storyProgress: number;                // 0.0-1.0 (emergent: completedBeats / totalExpectedBeats)
  bible: StoryBible;                    // Current world state (for condition evaluation)
}

interface MarkovStructureGuidance {
  readonly definition: NarrativeStructureDefinition;

  // Build transition matrix from YAML beat definitions + constraints
  initialize(): void;

  // Given current narrative state, predict likely next beats
  predictNext(state: NarrativeState): Array<{
    beatId: string;
    probability: number;                // 0.0-1.0
    constrained: boolean;               // Is this transition blocked by constraints?
  }>;

  // Score a proposed scene against Markov expectations
  scoreTransition(
    from: NarrativeState,
    proposedBeat: string,
    proposedMetadata: SceneMetadata
  ): TransitionScore;

  // Evaluate all constraints against current story state
  evaluateConstraints(story: StoryProgress): ConstraintViolation[];

  // Global structure health
  assessStructure(story: StoryProgress): StructureHealthReport;
}

interface TransitionScore {
  beatId: string;
  isTransitionValid: boolean;
  probability: number;                  // From Markov transition matrix
  surprise: number;                     // 0-1: how unexpected this transition is
  tensionAlignment: number;             // 0-1: how well scene tension matches expected
  constraintViolations: ConstraintViolation[];
  alternativePaths: Array<{
    beatId: string;
    probability: number;
  }>;
}

// Story progress is now emergent, not position-based
interface StoryProgress {
  completedBeats: BeatCompletion[];
  currentBeat: string | null;
  totalEstimatedBeats: number;          // Expected total (from structure + pacing)
}

interface BeatCompletion {
  beatId: string;
  sceneId: string;
  chapterId: string;
  tension: number;
  wordCount: number;
  metadata: SceneMetadata;
}

interface StructureHealthReport {
  expectedBeats: number;
  actualBeats: number;
  uniqueBeatsCompleted: string[];
  constraintsPassed: number;
  constraintsViolated: number;
  violations: ConstraintViolation[];
  mostLikelyRemainingPath: Array<{     // Monte Carlo path from Markov chain
    beatId: string;
    probability: number;
  }>;
  overallHealth: number;               // 0-100 combination of constraint compliance + transition likelihood
  deadEndWarning: boolean;             // True if no valid transitions from current state
}

// Constraint satisfaction engine
interface ConstraintEngine {
  check(          
    constraint: ConstraintDef,
    story: StoryProgress,
    bible: StoryBible
  ): ConstraintResult;

  // Batch check all constraints (used in gate evaluation)
  checkAll(story: StoryProgress, bible: StoryBible): ConstraintViolation[];

  // Repair suggestions when constraints fail
  suggestRemediation(violation: ConstraintViolation): string[];
}

type ConstraintResult = 
  | { status: "pass" }
  | { status: "fail"; violations: ConstraintViolation[] }
  | { status: "not_applicable"; reason: string };
```

### 3.3 Initial Structure Implementations

All structure plugins use the same Markov chain + constraint interface. The initial library ships with 12 structures, each with manually authored transition probabilities and constraints:

| Structure | Beats | Order | Key Constraints | Best For |
|-----------|-------|-------|-----------------|----------|
| **Hero's Journey** (Vogler/Campbell) | 12 YAML beats | 2nd-order | Strict ordering (Ordinary World → Call → Refusal → Mentor → ...). Count: each beat exactly once. Distance: none. | Fantasy, adventure, coming-of-age |
| **Three Act** (Field) | 3 acts | 1st-order | Order: Act 1 → Act 2 → Act 3. Tension: midpoint spike required. Reference: setup in Act 1 must pay off in Act 3. | General-purpose |
| **Freytag's Pyramid** | 5 beats | 1st-order | Order: strict sequential. Tension: climax at center, falling action must follow. | Tragedy, literary fiction |
| **Save the Cat** (Snyder) | 15 beats | 2nd-order | Order: complex with branching. Count: "midpoint" exactly once. Distance: "opening image" and "final image" must be ≥30 scenes apart. Reference: "theme stated" must echo in "theme confirmed." | Commercial fiction, film |
| **Story Circle** (Harmon) | 8 beats | 2nd-order | Order: circular — last beat leads back to first conceptually. Each beat exactly once. Reference: "change" must reference "comfort zone." | TV, simplified HJ |
| **Seven Point** (Wells) | 7 beats | 1st-order | Order: strict sequential. Tension: monotonic rise from point 1 to 7 except at midpoint. | Serial fiction |
| **Kishotenketsu** | 4 beats | 1st-order | Order: strict 1→2→3→4. Count: each exactly once. Distance: beats 2 & 3 must be similar length. | Literary, East Asian |
| **Jo-Ha-Kyu** | 3 stages | 1st-order | Tension: Jo (slow build) → Ha (break/acceleration) → Kyu (rapid conclusion). Duration: Jo=50%, Ha=30%, Kyu=20%. | Pacing-driven narrative |
| **Horror-Tension** | Custom beats | 2nd-order | Tension: oscillating peaks/valleys. Distance: relief scenes must follow tension peaks within 2 scenes. Reference: "threat introduced" must be followed by "threat escalated" within 5 scenes. | Horror, suspense, thriller |
| **Mystery Thriller** | Custom beats | 2nd-order | Distance: "clue given" to "clue resolved" must span ≥5 scenes. Reference: every "clue given" must have a "clue resolved" or "red herring revealed." Count: "red herring" 2-4. | Detective, mystery |
| **Romance Beat Sheet** | 12 beats | 1st-order | Order: "meet cute" before "first kiss." Distance: meet cute to first kiss ≥3 scenes. Tension: black moment must drop below 4. | Romance |
| **Rasa Theory** | 9 rasas | 2nd-order | Tension: specific rasa sequences (e.g., Shringara → Hasya → Karuna → Raudra → ...). Duration: each rasa minimum 2 scenes. | Emotion-driven narrative |

Each structure file is a standalone YAML file. Adding a new structure means defining beats with `transitions`, `constraints`, `tension_curve`, and `pacing` — no code changes needed.

### 3.4 Structure Registry

```typescript
interface StructureRegistry {
  register(plugin: MarkovStructureGuidance): void;
  get(id: string): MarkovStructureGuidance | undefined;
  list(): MarkovStructureGuidance[];
  selectForStory(premise: Premise): MarkovStructureGuidance[];

  // Markov-specific: structural similarity scoring
  findSimilar(structureId: string): Array<{
    id: string;
    similarity: number;         // 0-1, based on transition matrix overlap
    reason: string;
  }>;
}
```

### 3.5 Runtime Markov Chain Inference

```typescript
// The inference engine that powers MarkovStructureGuidance.predictNext()

class MarkovInferenceEngine {
  private transitionMatrix: Map<string, Map<string, number>>;
  private order: number;
  private constraintEngine: ConstraintEngine;

  constructor(structure: NarrativeStructureDefinition) {
    this.order = structure.order;
    this.constraintEngine = new ConstraintEngine(structure.constraints);
    this.buildTransitionMatrix(structure.beats);
  }

  // Build n-order transition matrix from beat definitions
  private buildTransitionMatrix(beats: NarrativeBeatDef[]): void {
    // For 1st-order: direct beat → beat transitions
    // For 2nd-order: (beat_{n-1}, beat_n) → beat_{n+1} transitions
    // Normalize weights per source state to sum to 1.0
    // Apply condition filters with fallback redistribution
  }

  // Predict with higher-order support
  predict(state: NarrativeState, story: StoryProgress): Array<{
    beatId: string;
    probability: number;
  }> {
    const key = this.buildStateKey(state);
    const rawTransitions = this.transitionMatrix.get(key) ?? new Map();
    
    // Filter by constraint engine
    const constrained = [...rawTransitions.entries()]
      .filter(([beatId]) => !this.constraintEngine.isBlocked(beatId, story))
      .map(([beatId, prob]) => ({
        beatId,
        probability: prob,
        constrained: false,
      }));

    // Renormalize after constraint filtering
    return this.renormalize(constrained);
  }

  // Build the state key for n-order lookup
  private buildStateKey(state: NarrativeState): string {
    const relevant = state.history.slice(-this.order);
    return relevant.join("→");
  }

  // Monte Carlo simulation for remaining path prediction
  monteCarloSimulation(
    state: NarrativeState,
    story: StoryProgress,
    iterations: number = 1000
  ): StructureHealthReport {
    const paths: string[][] = [];
    for (let i = 0; i < iterations; i++) {
      paths.push(this.simulatePath(state, story));
    }
    return this.aggregatePaths(paths, story, this.constraintEngine);
  }

  private simulatePath(state: NarrativeState, story: StoryProgress): string[] {
    const path: string[] = [];
    let current = state;
    for (let step = 0; step < 200; step++) { // safety cap
      const next = this.predict(current, story);
      const terminal = next.find(n => n.probability === 0);
      if (terminal) break; // Terminal state reached
      const chosen = this.weightedSample(next);
      path.push(chosen);
      current = { ...current, history: [...current.history, chosen], currentBeat: chosen };
    }
    return path;
  }
}
```

---

## 4. Scene Evaluation Engine

### 4.1 Scene Evaluation Datastore

After every scene is drafted, the Scene Evaluation Engine runs extraction and distributes evaluation requests:

```typescript
interface SceneEvaluation {
  sceneId: string;
  chapterId: string;
  actId: string;

  // Extracted metadata
  metadata: SceneMetadata;

  // Agent evaluations (populated asynchronously)
  evaluations: Map<string, AgentEvaluation>;

  // Overall gate status
  gateStatus: "pending" | "in_progress" | "passed" | "failed";
  gateDecisions: GateDecision[];
}

interface SceneMetadata {
  pov: string;
  characters: {
    present: string[];
    introduced: string[];
    departed: string[];
  };
  locations: string[];
  chronology: {
    start: string;         // ISO 8601 or relative marker
    end: string;
    timelineOrder: number; // Position in story chronology
  };
  tension: {
    startLevel: number;    // 1-10
    endLevel: number;
    peakLevel: number;
    curve: "rising" | "falling" | "sustained" | "volatile";
  };
  mood: string[];
  purpose: string;         // What narrative function this scene serves
  keyItems: Array<{
    name: string;
    significance: string;
    firstAppearance: boolean;
  }>;
  plotThreads: {
    advanced: string[];
    introduced: string[];
    resolved: string[];
    paused: string[];
  };
  questions: {
    raised: string[];
    answered: string[];
  };
  thematicMotifs: string[];
}

interface AgentEvaluation {
  agentId: string;
  status: "pass" | "conditional_pass" | "fail" | "abstain";
  score?: number;          // 1-10
  issues: EvaluationIssue[];
  summary: string;
  timestamp: string;
}

interface EvaluationIssue {
  severity: "critical" | "major" | "minor" | "suggestion";
  category: string;        // e.g., "continuity", "pacing", "voice"
  description: string;
  location?: {
    type: "scene" | "chapter" | "paragraph" | "line";
    reference: string;
  };
  recommendation?: string;
}

interface GateDecision {
  gateId: string;           // e.g., "chapter-summary-gate"
  status: "approved" | "rejected";
  requiredApprovals: string[];  // Agent IDs that must approve
  approvals: string[];          // Agent IDs that approved
  rejections: Array<{
    agentId: string;
    reason: string;
    blockingIssues: EvaluationIssue[];
  }>;
  timestamp: string;
}
```

### 4.2 Markov Chain + Constraint Comparison

Narratologist and related agents use the Markov chain guidance + constraint system to compare actual story progress against the structural ideal. Instead of checking "are we at position X%?" (old position model), they check "did the transition from beat A to beat B match expectations?" and "are long-range constraints satisfied?"

```typescript
// After each scene evaluation, update the Markov state
interface MarkovStorySnapshot {
  structureId: string;                   // Active narrative structure
  currentBeat: string;                   // Last completed beat
  history: string[];                     // Full beat history (for higher-order transitions)
  completedScenes: BeatCompletion[];
  totalEstimatedScenes: number;
  storyProgress: number;                 // Emergent: completedBeats / totalEstimatedBeats
  constraintViolations: ConstraintViolation[];
  transitionHistory: Array<{
    from: string;
    to: string;
    probability: number;
    surprise: number;
  }>;
}

// Evaluate against the Markov chain guidance
async function analyzeStructureWithMarkov(
  snapshot: MarkovStorySnapshot,
  guidance: MarkovStructureGuidance
): Promise<{
  // Markov chain health
  averageTransitionProbability: number;  // Higher = more predictable (good for genre fiction)
  averageSurprise: number;               // Lower = structurally conservative
  deadEndRisk: boolean;                  // True if few valid transitions remain
  mostLikelyPath: string[];              // Monte Carlo predicted remaining beats

  // Constraint compliance
  constraintsPassed: number;
  constraintsViolated: number;
  criticalViolations: ConstraintViolation[];
  remediations: Map<string, string[]>;   // constraintId → fix suggestions

  // Tension curve alignment
  tensionExpectation: {
    currentExpected: number;
    currentActual: number;
    trendAlignment: "on_track" | "deviating" | "diverged";
  };

  // Overall
  overallHealth: number;                 // 0-100
  recommendations: string[];
}>;

// This report feeds directly into:
// 1. Narratologist's evaluation (structure integrity)
// 2. Pacing Analyst's report (tension curve + transition pacing)
// 3. Mood/Tension Curator's recommendations (emotional arc vs Markov expectations)
// 4. Narrative Consistency's assessment (constraint violations)
// 5. The Writer's revision guidance ("consider transitioning to beat X next")
```

### 4.3 Scene Extraction Pipeline

```typescript
interface SceneExtractor {
  // Extract structured metadata from raw scene prose
  extract(scene: SceneDocument, context: StoryContext): Promise<SceneMetadata>;

  // Diff metadata against previous scene for continuity tracking
  diff(previous: SceneMetadata, current: SceneMetadata): MetadataDiff;
}

interface MetadataDiff {
  newCharacters: string[];
  missingCharacters: string[];
  locationChanges: string[];
  itemTransfers: Array<{ item: string; from: string; to: string }>;
  timelineGaps: Array<{ expected: string; actual: string }>;
  knowledgeInconsistencies: Array<{
    character: string;
    claims: string;
    evidence: string;
  }>;
}
```

---

## 5. Interview Protocol (Phase 1)

The Author-agent conducts a structured interview until evaluating agents confirm sufficient story depth.

### 5.1 Interview Dimensions

| Dimension | Questions | Min Depth | Evaluated By |
|-----------|-----------|-----------|-------------|
| **Premise** | What is the story about? What is the controlling idea? | Testable premise sentence | Thematic Coherence, Critic |
| **Protagonist** | Who is the main character? What is their wound/need? | Egri triad + arc direction | Character Consistency, Critic |
| **World** | Where/when does it take place? What are the rules? | Setting + boundaries | World-building, Localizer |
| **Structure** | Which narrative template? Key beats? | Selected structure plugin | Narratologist |
| **Genre & Tone** | What genre conventions? What voice/style? | Genre + Stylesheet selection | Stylesheet, Mood/Tension |
| **Antagonist** | Who/what opposes? What is their legitimate goal? | Opposition profile | Narrative Consistency |
| **Theme** | What does the story argue? What changes? | Controlling idea statement | Thematic Coherence |
| **Ending** | How does it end? What is proven? | Climax shape | Narratologist |
| **Scale** | How long? How many POVs? Scope? | Target metrics | Pacing Analyst |

### 5.2 Depth Satisfaction Protocol

```typescript
interface DepthAssessment {
  dimension: string;
  score: number;           // 0.0-1.0
  minimumRequired: number;
  status: "insufficient" | "marginal" | "sufficient" | "comprehensive";
  missingElements: string[];
  followUpQuestions: string[];
}

// Author-agent drives the interview, other agents assess depth
interface InterviewOrchestrator {
  // Ask next question based on depth gaps
  generateNextQuestion(
    answered: InterviewAnswer[],
    assessments: DepthAssessment[]
  ): string;

  // Check if all agents are satisfied
  isDepthSufficient(assessments: DepthAssessment[]): boolean;

  // Generate interview summary for pipeline handoff
  synthesize(
    answers: InterviewAnswer[],
    assessments: DepthAssessment[]
  ): InterviewSummary;
}
```

---

## 6. Writing Pipeline (Phase 2)

### 6.1 Phase Flow

> **Design change**: Chapters are no longer planned upfront. The Markov chain + Scene Planner generates scene parameters first, agents evaluate the *plan* (cheap — no prose), and only after approval does the Writer generate prose. Chapters are deduced retroactively from scene clusters.

> **Design addition**: A new Phase 0 (Material Ingestion) precedes the interview. The user dumps all raw material into `raw-inputs/`. The Archivist agent processes it into an interlinked LLM-maintained wiki, which populates the Story Bible. The interview starts with this information already loaded.

```
Phase 0: Material Ingestion
    │  User prompt: "Put all your material in raw-inputs/"
    │  User fills raw-inputs/ with notes, drafts, research, etc.
    │  User signals "ready"
    │
    ▼
    │  Archivist (Organizing Agent) scans raw-inputs/
    │  Reads each file — notes, drafts, research, images
    │  Creates/maintains wiki in story/wiki/:
    │    ├── index.md              (page catalog)
    │    ├── characters/           (one page per character)
    │    ├── locations/            (one page per location)
    │    ├── concepts/             (themes, lore, technology)
    │    ├── plot/                 (plot threads, arcs)
    │    ├── research/             (factual references)
    │    └── scenes/               (partial drafts)
    │  Each page is interlinked markdown: [[sarah-chen]]
    │  Links updated, index regenerated, log appended
    │
    ▼
    │  Wiki → In-memory Bible cache (deterministic extraction)
    │  CharacterState, LocationState, PlotThread, etc.
    │  populated from wiki page content + frontmatter
    │
    ▼  [User reviews wiki, requests changes, adds more]
    │  Loop: user adds → Archivist processes → user approves
    │  User signals "interview ready"
    │
    ▼
    │
Phase 1 (Interview)
    │  Author-agent starts with wiki already loaded
    │  Interview fills gaps the wiki doesn't cover
    │  New information → wiki updated in real-time
    │
    ▼  [Depth Satisfaction Gate — all agents approve]
    │
    ┌─────────────────────────────────────────────┐
    │         PER-SCENE LOOP (Phases 2a-2c)        │
    │  Each iteration produces one completed scene │
    │  Loop continues until Markov chain hits a    │
    │  terminal state (story complete)             │
    └─────────────────────────────────────────────┘
    │
    ▼
Phase 2a: Scene Plan Generation (Markov Chain)
    │  1. MarkovInferenceEngine.predictNext(state)
    │     → candidate beats with probabilities
    │  2. ScenePlanner.enrich(beat, Bible, state)
    │     → ScenePlan { beat, purpose, suggested POV,
    │       suggested characters, target tension,
    │       plot threads, questions, thematic motifs }
    │  3. ScenePlan has ZERO prose — pure parameters
    │
    ▼  [Gate: Agents evaluate Scene Plan]
    │  ─────────────────────────────────────
    │  Evaluators (parallel, cheap — no prose to read):
    │    • Narratologist: valid Markov transition?
    │    • Character Consistency: characters available?
    │    • Thematic Coherence: serves controlling idea?
    │    • Mood/Tension Curator: tension fits arc?
    │    • Critic: is this plan interesting?
    │
    │  Decision:
    │    • PASS → proceed to Phase 2b
    │    • FAIL → Markov generates alternative plan
    │      (up to budget maxPlanAttempts, then escalation)
    │
    ▼
    │
Phase 2b: Scene Writing
    │  Writer receives approved ScenePlan
    │  Generates full scene prose (Markdown)
    │
    ▼  [Gate: Agents evaluate Scene Prose]
    │  ─────────────────────────────────────
    │  Same evaluators + full-text agents:
    │    • Editor: line-level prose quality
    │    • Dialogist: dialogue naturalness
    │    • Stylesheet: voice/POV/tone compliance
    │    • Fact-Checker: factual consistency
    │    • Character Consistency: voice + behavior
    │    • Pacing Analyst: tension curve fit
    │    • ... all 16 agents evaluate their dimension
    │
    │  Decision:
    │    • PASS → proceed to Phase 2c
    │    • FAIL → Writer revises prose (budget-limited)
    │
    ▼
    │
Phase 2c: Bible Update + Chapter Deduction
    │  1. Scene extractor runs → StructuredMetadata
    │  2. BibleSync: update StoryBible with new state
    │     • Characters: knowledge, location, status
    │     • Items: introduced, moved, used
    │     • Plot threads: advanced, resolved, introduced
    │     • Dramatic questions: raised, answered
    │     • Timeline: new entry
    │  3. Markov state advances: history += new beat
    │  4. ChapterDeductor runs (every 3 scenes or on demand):
    │     • Scans scene sequence for natural breaks
    │       (POV change, time jump, location shift,
    │        mini-arc completion, tension reset)
    │     • Groups scenes into chapters (3-6 per chapter)
    │     • Generates chapter title + summary
    │     • Writes chapter.yaml + updates directory structure
    │  5. Check if Markov chain is at terminal state
    │     • YES → story complete, exit loop
    │     • NO  → back to Phase 2a (next scene)
    ▼
    │
    ┌─────────────────────────────────────────────┐
    │         CHAPTER DEDUCED RETROACTIVELY        │
    │  Chapters are written to disk during this    │
    │  phase. The project always has a valid       │
    │  directory structure — chapters just appear  │
    │  as scenes accumulate.                       │
    └─────────────────────────────────────────────┘
    │
    ▼
    │
Phase 3: Revision (optional)
    │  Global consistency pass (after all scenes complete)
    │  Backward propagation for promises/payoffs
    │  Long-range constraint audit
    │  Final approval gate
    ▼
    │
COMPLETE
```

### 6.2 Scene Plan (Markov-Generated Parameters)

The Scene Plan is the intermediate representation between Markov chain output and prose generation. It is a structured parameter bundle with NO prose:

```typescript
interface ScenePlan {
  // Markov chain provenance
  beat: string;                          // Selected beat ID
  transition: {
    from: string;                        // Previous beat ID
    probability: number;                 // Markov transition probability (0-1)
    surprise: number;                    // 1 - probability (how unexpected)
    alternatives: Array<{                // What else was considered
      beatId: string;
      probability: number;
    }>;
  };

  // Scene purpose
  purpose: string;                       // Narrative function (from beat definition)
  narrativeFunction: string;             // e.g., "inciting-incident", "rising-action"

  // Generated parameters (enriched by ScenePlanner)
  suggestedPov: string;                  // From Bible: which character's POV fits
  suggestedCharacters: string[];         // From Bible: who is available/likely
  suggestedLocation: string;             // From Bible: where does this beat typically occur
  targetTension: number;                 // 1-10 from beat definition
  expectedDuration: string;              // e.g., "single evening" | "several days"

  // Narrative state alignment
  plotThreadsToAdvance: string[];        // Which threads to move forward
  questionsToRaise: string[];            // Dramatic questions for this scene
  questionsToAnswer: string[];           // Questions this scene should resolve
  thematicMotifs: string[];              // Themes to touch

  // Bible alignment evidence
  evidence: {
    charactersAvailable: string[];       // Bible-confirmed location matches
    locationEstablished: boolean;
    timelineConsistent: boolean;
  };
}

interface ScenePlanner {
  // Enrich a Markov chain beat prediction into a full ScenePlan
  plan(
    beatId: string,
    state: NarrativeState,
    bible: StoryBible,
    structure: MarkovStructureGuidance
  ): ScenePlan;

  // Generate multiple alternatives for agent comparison
  generateAlternatives(
    state: NarrativeState,
    bible: StoryBible,
    count: number  // e.g., 3 alternatives
  ): ScenePlan[];
}
```

### 6.3 Scene Plan Gate

The Scene Plan Gate is the evaluation step between Phase 2a (Markov generates plan) and Phase 2b (Writer generates prose). Since the plan contains NO prose, evaluation is cheap — agents assess parameters, not text:

```typescript
interface ScenePlanGate {
  // Evaluate a Scene Plan and produce a decision
  evaluate(plan: ScenePlan, bible: StoryBible, structure: MarkovStructureGuidance): Promise<PlanGateDecision>;

  // Get targeted feedback from specific evaluators
  getEvaluatorFeedback(plan: ScenePlan, agentIds: string[]): Promise<Map<string, PlanEvaluation>>;
}

interface PlanGateDecision {
  status: "pass" | "reject" | "alternative_requested";

  // Per-agent evaluations (parallel, cheap)
  evaluations: Map<string, PlanEvaluation>;

  // If rejected: what to fix
  rejectionReason?: string;
  alternativeRequest?: {
    reason: string;
    constraints: Partial<ScenePlan>;  // e.g., { beat: "must be first-kiss not complication" }
  };
}

interface PlanEvaluation {
  agentId: string;
  dimension: string;                // e.g., "structural", "character", "thematic"
  status: "approve" | "reject" | "abstain";

  // Confidence in the evaluation (0-1)
  // Low confidence = plan is ambiguous, needs more detail
  confidence: number;

  notes: string;
  suggestedBeatIds?: string[];      // If the evaluator thinks a different beat fits better
  suggestedPovCharacter?: string;   // If the evaluator suggests a different POV
}

// What each evaluator checks during the plan gate:
const PLAN_GATE_EVALUATORS: Record<string, PlanCheck> = {
  "Narratologist": {
    checks: [
      "Is this a valid Markov transition from the current state?",
      "Does the transition probability make structural sense?",
      "Are any constraints triggered by this beat transition?",
      "Is the beat timing appropriate (not too early/late in story)?",
    ],
  },
  "Character Consistency": {
    checks: [
      "Are the suggested characters available at this narrative location?",
      "Would the POV character's knowledge state fit this scene?",
      "Is the suggested character combination likely given the Bible state?",
    ],
  },
  "Thematic Coherence": {
    checks: [
      "Does the scene purpose serve the story's controlling idea?",
      "Are the suggested thematic motifs relevant to this stage?",
    ],
  },
  "Mood/Tension Curator": {
    checks: [
      "Does the target tension level match the expected arc at this point?",
      "Is the emotional trajectory consistent with recent scenes?",
    ],
  },
  "Critic": {
    checks: [
      "Is this scene plan dramatically interesting?",
      "Does it raise compelling questions?",
      "Is there a risk of cliché with this beat choice?",
    ],
  },
  "Narrative Consistency": {
    checks: [
      "Does this scene plan advance the right plot threads?",
      "Are any dramatic questions being answered too early or too late?",
      "Does the plan maintain promise/payoff integrity?",
    ],
  },
};

// Cost profile: ~200-500 tokens per evaluator (vs 2000-8000 for prose evaluation)
// Total plan gate: ~1200-3000 tokens — roughly 15-25% of a prose evaluation gate
```

### 6.4 Chapter Deduction

Chapters are deduced retroactively from the scene sequence. No upfront planning required:

```typescript
interface ChapterDeductor {
  // Run after each scene completion (or on demand every N scenes)
  deduce(completedScenes: SceneDocument[]): ChapterDeductionResult;

  // Force re-deduction for a range of scenes (after revisions)
  reDeduce(
    scenes: SceneDocument[],
    fromSceneIndex: number
  ): ChapterDeductionResult;
}

interface ChapterDeductionResult {
  chapters: Chapter[];
  changes: Array<{
    type: "created" | "merged" | "split" | "unchanged";
    chapterId: string;
    sceneIds: string[];
  }>;
}

// Chapter break heuristic scoring
interface ChapterBreakHeuristic {
  score(sceneA: SceneDocument, sceneB: SceneDocument): number;
  // Higher score = stronger chapter break signal
  // Factors:
  //   - Time gap (hours/days between scenes)
  //   - POV change
  //   - Location change
  //   - Tension reset (sceneA.endTension → sceneB.startTension drop > 3)
  //   - Mini-arc completion (a plot thread resolved)
  //   - Beat boundary (major beat completed)
}

// Default thresholds
const CHAPTER_BREAK_THRESHOLD = 3.0;    // Sum of heuristic scores above this = break
const MIN_SCENES_PER_CHAPTER = 3;
const MAX_SCENES_PER_CHAPTER = 6;
const DEDUCTION_INTERVAL = 3;            // Check for breaks every 3 scenes
```

### 6.5 Iteration Budget & Stop Criteria

> **Critical gap identified by Metis**: Without explicit stop conditions, the pipeline loops forever or wastes compute on diminishing returns.

Every evaluation gate has a revision cap. The Writer gets N attempts per scene before escalation. "Good enough" thresholds prevent infinite polish loops.

```typescript
interface IterationBudget {
  // Per-scene caps
  maxRevisionsPerScene: number;           // Default: 5
  maxRevisionsPerGate: number;            // Default: 3 per gate type (summaries, scenes, integration)

  // Cost-aware circuit breakers
  maxTokensPerScene: number;              // Hard cap: total tokens spent on a single scene
  maxApiCallsPerPhase: number;            // Hard cap: total LLM calls per phase
  costThreshold: {
    maxUsdPerScene: number;               // e.g., $0.50 — stop if scene exceeds this
    maxUsdPerChapter: number;             // e.g., $5.00
    warnAtPercent: number;                // Warning issued at 80% of budget
  };

  // "Good enough" thresholds
  evaluationThresholds: {
    minPassRate: number;                  // e.g., 0.8 — 80% of evaluators must pass
    criticalIssuesAllowed: number;        // Max critical issues before forced revision
    minimumScore: number;                 // 0-10 floor per evaluator type
  };

  // Escalation
  onBudgetExhausted: "escalate-to-human" | "force-pass" | "skip-scene" | "abort-phase";
}

// Runtime budget tracker
interface BudgetTracker {
  budget: IterationBudget;
  spent: {
    revisions: number;
    tokens: number;
    apiCalls: number;
    costUsd: number;
  };

  canContinue(): boolean;                 // Check all budgets
  report(): BudgetReport;                 // Current spending summary
  resetForNextScene(): void;
}

// The revision loop with budget awareness
interface SceneRevisionLoop {
  writeAndEvaluate(scene: SceneSummary, budget: BudgetTracker): AsyncIterable<{
    attempt: number;
    evaluation: SceneEvaluation;
    gateResult: GateDecision;
    budgetRemaining: BudgetReport;
  }>;
}
```

**"Good Enough" Escalation Ladder:**

| Attempt | Behavior |
|---------|----------|
| 1-3 | Normal: full evaluation gate, all agents must pass |
| 4 | Relaxed: critical-issue evaluators only (Fact-Checker, Character Consistency, Narrative Consistency). Minor issues deferred. |
| 5 | Final attempt: Writer produces best-effort version. All critical issues must be resolved. Minor issues logged. Escalation if still failing. |
| 6+ | Budget exhausted → triggers `onBudgetExhausted` action |

### 6.6 Conflict Resolution Protocol

> **Critical gap identified by Metis**: When agents disagree on a gate decision, the system needs a deterministic resolution path, not an infinite loop.

#### Escalation Ladder

```
Agent 1: FAIL → "Pacing is off"
Agent 2: FAIL → "Dialogue feels unnatural"
Agent 3: PASS
Agent 4: FAIL → "Character voice inconsistent"
                         │
                         ▼
          ┌─────────────────────────────┐
          │  Step 1: Weighted Voting    │
          │  (count votes, fail if ≥50%)│
          └──────────┬──────────────────┘
                     │ (still unresolved)
                     ▼
          ┌─────────────────────────────┐
          │  Step 2: Lead-Agent Review  │
          │  Critic (lead) adjudicates  │
          │  "Which issues are blocking?"│
          └──────────┬──────────────────┘
                     │ (still deadlocked)
                     ▼
          ┌─────────────────────────────┐
          │  Step 3: Human-in-Loop      │
          │  Present summary to user    │
          │  User resolves with one     │
          │  decision: pass / revise    │
          └─────────────────────────────┘
```

```typescript
interface ConflictResolution {
  // Voting weights — agents with higher relevance have more weight
  readonly votingWeights: Record<string, number>;

  // Resolve a gate conflict
  resolve(gate: GateDecision, evaluations: AgentEvaluation[]): ResolutionResult;

  // Fallback: determine if human intervention is needed
  needsHumanIntervention(attempt: number, conflicts: Conflict[]): boolean;
}

interface ResolutionResult {
  decision: "pass" | "revise" | "escalated";
  reasoning: string;                     // Explanation for the decision
  overriddenEvaluations: Array<{
    agentId: string;
    original: "pass" | "fail";
    overriddenTo: "pass" | "fail";
    reason: string;
  }>;
  deferredIssues: EvaluationIssue[];    // Logged but non-blocking
}

// Voting weights per gate type
const VOTING_WEIGHTS: Record<string, Record<string, number>> = {
  "scene-writing-gate": {
    "Narrative Consistency": 1.5,        // Global coherence = highest weight
    "Character Consistency": 1.3,
    "Fact-Checker": 1.2,
    "Critic": 1.0,                       // Baseline
    "Editor": 0.8,
    "Pacing Analyst": 0.8,
    // ... agents with lower relevance score lower
  },
  "chapter-summary-gate": {
    "Narratologist": 1.5,               // Structure matters most at summary level
    "Thematic Coherence": 1.3,
    "Pacing Analyst": 1.0,
    // ...
  },
};
```

**Conflict Categories:**

| Conflict Type | Resolution Strategy |
|--------------|-------------------|
| **Pacing vs Content** (Pacing says too fast, Critic says great) | Lead-agent adjudication. Pacing threshold adjusted. |
| **Fact vs Creative** (Fact-Checker flags inaccuracy, Writer says artistic license) | Levels: minor → license allowed. Critical plot hole → fact wins. |
| **Voice vs Consistency** (Dialogist says unique voice, Character Consistency says OOC) | Character Bible reference. If Bible supports it, Character Consistency defers. |
| **Structure vs Organic** (Narratologist says off-beat, Critic says it works) | Allow deviation with annotation. Re-evaluate at chapter level whether it paid off. |
| **Budget vs Quality** (Attempt 5, still failing) | Escalate to human. Present summary: "N attempts, X cost, remaining issues: Y. Pass or revise?" |

### 6.7 Orchestrator

```typescript
interface PipelineOrchestrator {
  // Current phase tracking
  readonly currentPhase: PipelinePhase;
  readonly currentSceneIndex: number;

  // Run the interview phase
  runInterview(context: InitialPrompt): AsyncIterable<PipelineEvent>;

  // Run the full per-scene loop (Phases 2a-2c)
  // Returns completed scenes + deduced chapters
  runSceneLoop(
    interviewSummary: InterviewSummary,
    structure: MarkovStructureGuidance,
    bible: StoryBible
  ): AsyncIterable<PipelineEvent>;

  // Generate a scene plan from Markov chain (Phase 2a)
  generateScenePlan(
    state: NarrativeState,
    bible: StoryBible,
    structure: MarkovStructureGuidance
  ): Promise<ScenePlan>;

  // Evaluate a scene plan (Gate: plan evaluation)
  evaluateScenePlan(
    plan: ScenePlan,
    bible: StoryBible
  ): Promise<GateDecision>;

  // Generate a scene plan alternative (on plan rejection)
  generateAlternativePlan(
    rejectedPlan: ScenePlan,
    feedback: GateRejection[],
    state: NarrativeState,
    bible: StoryBible
  ): Promise<ScenePlan>;

  // Write scene prose from an approved plan (Phase 2b)
  writeSceneFromPlan(
    plan: ScenePlan,
    context: StoryContext
  ): AsyncIterable<PipelineEvent>;

  // Evaluate scene prose (Gate: prose evaluation)
  evaluateSceneProse(
    scene: SceneDocument,
    plan: ScenePlan
  ): Promise<GateDecision>;

  // Bible sync + chapter deduction (Phase 2c)
  integrateScene(
    scene: SceneDocument,
    bible: StoryBible
  ): AsyncIterable<PipelineEvent>;

  // Deduce chapters from completed scenes
  deduceChapters(
    completedScenes: SceneDocument[]
  ): ChapterDeductionResult;

  // Global revision pass (Phase 3)
  revise(context: StoryContext): AsyncIterable<PipelineEvent>;
}

type PipelinePhase =
  | "interview"
  | "scene-loop"                       // Phases 2a-2c per-scene loop
  | "revision"
  | "complete";

type SceneLoopSubPhase =
  | "scene-planning"                   // 2a: Markov generates plan
  | "plan-evaluation"                  // Gate: agents evaluate plan
  | "scene-writing"                    // 2b: Writer generates prose
  | "prose-evaluation"                 // Gate: agents evaluate prose
  | "bible-update"                     // 2c: Bible sync
  | "chapter-deduction";               // 2c: Chapter clustering

type PipelineEvent =
  | { type: "agent_message"; message: AgentMessage }
  | { type: "phase_change"; from: PipelinePhase; to: PipelinePhase }
  | { type: "scene_loop_subphase"; subPhase: SceneLoopSubPhase; sceneIndex: number }
  | { type: "scene_plan_generated"; sceneIndex: number; plan: ScenePlan }
  | { type: "scene_plan_gate"; sceneIndex: number; decision: "pass" | "fail" | "alternative_requested" }
  | { type: "gate_open"; gateId: string; phase: PipelinePhase }
  | { type: "gate_closed"; gateId: string; phase: PipelinePhase; rejections: GateRejection[] }
  | { type: "content_generated"; phase: PipelinePhase; contentId: string }
  | { type: "evaluation_complete"; agentId: string; sceneId: string; result: AgentEvaluation }
  | { type: "extraction_complete"; sceneId: string; metadata: SceneMetadata }
  | { type: "chapter_deduced"; chapterId: string; sceneIds: string[] }
  | { type: "error"; phase: PipelinePhase; error: PipelineError };
```

---

## 7. Model Capability Tiers

### 7.1 Tier Definitions

```typescript
const CAPABILITY_TIERS = {
  // PROSE GENERATION TIERS
  "prose-gen-tier-1": {
    reasoning: "high",
    creativity: "very-high",
    contextWindow: "very-large",
    description: "Best available model for prose generation. Long-form narrative coherence.",
    typicalModels: ["claude-opus-4-7", "gpt-5.5", "kimi-k2.6"], // illustrative, not normative
  },
  "prose-gen-tier-2": {
    reasoning: "medium",
    creativity: "high",
    contextWindow: "large",
    description: "Strong prose generation, adequate for most scenes.",
    fallbackFrom: ["prose-gen-tier-1"],
  },
  "prose-gen-tier-3": {
    reasoning: "low",
    creativity: "medium",
    contextWindow: "medium",
    description: "Basic prose generation for simple scenes or first drafts.",
    fallbackFrom: ["prose-gen-tier-2"],
  },

  // ANALYSIS TIERS
  "analysis-tier-1": {
    reasoning: "very-high",
    creativity: "low",
    contextWindow: "large",
    description: "Deep structural analysis, continuity, complex causality.",
    typicalModels: ["gpt-5.5-xhigh", "gemini-3.1-pro", "claude-opus-4-7"],
  },
  "analysis-tier-2": {
    reasoning: "high",
    creativity: "low",
    contextWindow: "medium",
    description: "Competent analysis for most evaluation tasks.",
    fallbackFrom: ["analysis-tier-1"],
  },
  "analysis-tier-3": {
    reasoning: "medium",
    creativity: "low",
    contextWindow: "medium",
    description: "Basic pattern matching and consistency checking.",
    fallbackFrom: ["analysis-tier-2"],
  },

  // RESEARCH TIERS
  "research-tier-1": {
    reasoning: "high",
    creativity: "medium",
    contextWindow: "large",
    description: "Deep research with tool use (web search, data analysis).",
    typicalModels: ["gpt-5.5", "claude-sonnet-4-6", "gemini-3.1-pro"],
  },
  "research-tier-2": {
    reasoning: "medium",
    creativity: "low",
    contextWindow: "medium",
    description: "Light research and fact verification.",
    fallbackFrom: ["research-tier-1"],
  },

  // CREATIVITY TIERS
  "creativity-tier-1": {
    reasoning: "medium",
    creativity: "very-high",
    contextWindow: "large",
    description: "Ideation, brainstorming, creative prompts.",
    typicalModels: ["claude-sonnet-4-6", "gpt-5.5", "kimi-k2.6"],
  },
  "creativity-tier-2": {
    reasoning: "low",
    creativity: "high",
    contextWindow: "medium",
    description: "Light ideation and suggestion generation.",
    fallbackFrom: ["creativity-tier-1"],
  },

  // SPECIALIZED TIERS
  "cultural-tier-1": {
    reasoning: "medium",
    creativity: "medium",
    contextWindow: "medium",
    description: "Cultural knowledge, localization, regional accuracy.",
  },
  "style-tier-1": {
    reasoning: "high",
    creativity: "medium",
    contextWindow: "medium",
    description: "Style enforcement, voice consistency, register analysis.",
  },
  "emotional-tier-1": {
    reasoning: "medium",
    creativity: "high",
    contextWindow: "medium",
    description: "Emotional arc tracking, mood analysis, tension mapping.",
  },
} as const;
```

### 7.2 Agent-to-Tier Mapping

| Agent | Primary Tier | Fallback Chain |
|-------|-------------|----------------|
| Writer | prose-gen-tier-1 | prose-gen-tier-2 → prose-gen-tier-3 |
| Editor | analysis-tier-2 | analysis-tier-3 |
| Critic | analysis-tier-1 | analysis-tier-2 |
| Ideator | creativity-tier-1 | creativity-tier-2 |
| Researcher | research-tier-1 | research-tier-2 |
| Fact-Checker | analysis-tier-1 | analysis-tier-2 |
| Localizer | cultural-tier-1 | analysis-tier-2 |
| Narratologist | analysis-tier-1 | analysis-tier-2 |
| Pacing Analyst | analysis-tier-2 | analysis-tier-3 |
| Character Consistency | analysis-tier-1 | analysis-tier-2 → prose-gen-tier-2 |
| Thematic Coherence | analysis-tier-1 | analysis-tier-2 |
| World-building | analysis-tier-2 | analysis-tier-3 |
| Dialogist | analysis-tier-2 | prose-gen-tier-2 |
| Stylesheet | style-tier-1 | analysis-tier-2 |
| Mood/Tension Curator | emotional-tier-1 | analysis-tier-2 |
| Narrative Consistency | analysis-tier-1 | analysis-tier-2 |

---

## 8. Multi-Harness Adapter Interfaces

### 8.1 Core Adapter Interface

```typescript
// Every harness adapter implements this
interface HarnessAdapter {
  readonly harnessId: string;  // "opencode" | "codex" | "claude-code" | "standalone"

  // Lifecycle
  initialize(config: HarnessConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Agent dispatch (how the harness runs an agent)
  dispatchAgent(
    agent: LiteraryAgent,
    task: AgentTask,
    context: StoryContext
  ): Promise<AgentResult>;

  // Communication (how agents message each other through the harness)
  setupMailbox(mailbox: AgentMailbox): Promise<void>;
  teardownMailbox(): Promise<void>;

  // Event hooks (harness-specific lifecycle)
  onEvent(handler: (event: PipelineEvent) => void): void;
}

interface AgentTask {
  type: "generate" | "evaluate" | "extract" | "interview";
  payload: unknown;
  context: {
    sceneId?: string;
    chapterId?: string;
    storyPath: string;
  };
  capabilityTier: string;
}
```

### 8.2 OpenCode Adapter

The OpenCode adapter would implement `HarnessAdapter` using:
- **Hooks**: ToolGuard hooks for each agent's evaluation
- **Agents**: Register literary agents as OpenCode agent definitions
- **Team Mode**: Use mailbox `team_send_message` for agent communication
- **MCP**: Context7 for researcher, websearch for fact-checker
- **Skills**: Narrative structure plugins as SKILL.md files

Key mapping:
```
OpenCode Agent    → LiteraryAgent
OpenCode Tool     → Scene evaluator / extractor
OpenCode Hook     → Evaluation gate / pipeline phase transition
Team Mode Mailbox → AgentMessage bus
OpenCode Skill    → Narrative structure plugin
```

### 8.3 Codex Adapter

The Codex adapter would implement `HarnessAdapter` using:
- **Plugin events**: `SessionStart` → pipeline init, `UserPromptSubmit` → interview, `PreToolUse` → gate checks
- **Components**: Register literary agents as Codex plugin components
- **LSP**: Not applicable (prose, not code)
- **Config**: `config.toml` for capability tier → model mapping

### 8.4 Claude Code Adapter

The Claude Code adapter would implement `HarnessAdapter` using:
- **Skills**: Each narrative structure as a SKILL.md
- **Hooks**: Custom hooks for evaluation gates
- **Commands**: Slash commands for Phase transitions (`/interview`, `/write-chapter`, `/evaluate-scene`)

### 8.5 Standalone CLI

The standalone adapter would implement `HarnessAdapter` without any external harness:
- Process-based agent isolation
- File-system mailbox (JSON files in `.omo/writer-mailbox/`)
- CLI entry points for each phase
- Config via `writer.yaml`

---

## 9. Implementation Notes

### 9.1 Package Structure (Suggested)

```
packages/
├── writer-core/                    # Harness-agnostic core library
│   ├── src/
│   │   ├── agents/                 # Agent interfaces, registry, factory
│   │   ├── pipeline/              # Pipeline orchestrator, phases, gates
│   │   ├── model/                 # Story data model, file format
│   │   ├── evaluation/            # Scene extractor, evaluation engine
│   │   ├── narrative-structures/  # Plugin system + built-in plugins
│   │   ├── communication/         # Mailbox protocol, message types
│   │   ├── interview/             # Interview orchestrator, depth assessment
│   │   ├── capabilities/          # Model capability tiers
│   │   └── adapter/               # HarnessAdapter interface + types
│   ├── __tests__/
│   └── package.json
│
├── writer-adapter-opencode/       # OpenCode plugin adapter
│   ├── src/
│   │   ├── plugin.ts             # PluginModule entry
│   │   ├── hooks/                # Evaluation gate hooks
│   │   ├── tools/                # Scene extractor tool, etc.
│   │   └── agents/               # Literary agent → OpenCode agent mapping
│   └── package.json
│
├── writer-adapter-codex/          # Codex CLI adapter
├── writer-adapter-claude-code/    # Claude Code adapter
├── writer-cli/                    # Standalone CLI
└── writer-narrative-plugins/      # Additional narrative structure plugins
```

### 9.2 Key Design Decisions

1. **Agents communicate through a mailbox, not direct calls.** This enables parallel evaluation, async processing, and harness portability.

2. **Scene extraction is a deterministic pipeline step**, not an AI task. The extractor parses prose + YAML to generate structured metadata. AI agents consume this metadata, not raw prose.

3. **Capability tiers are abstract.** The `writer.yaml` config maps tiers to concrete models per installation. This is the deployment concern, not an architecture concern.

4. **Hard gates are the default.** All gates require unanimous approval from relevant agents. The system stops at the first failure. The Writer revises and re-submits.

5. **Narrative structures are YAML-defined Markov models.** Adding a new structure means writing a YAML file with beat definitions, transition probabilities, and declarative constraints — no code changes needed. The `MarkovStructureGuidance` interface is implemented by the engine, not by individual structures.

6. **Markov transitions guide, not gate.** A low-probability transition (e.g., skipping straight to the climax) is not an error — it's *interesting*. The system flags it with a high `surprise` score. The Writer can justify it or revise. The constraint system catches genuine structural violations (e.g., "climax before conflict").

7. **Position is emergent.** Story progress is `completedBeats / totalEstimatedBeats`, not a hardcoded percentage target. The tension curve uses this emergent progress for comparison. This means a 15-beat story and a 30-beat story both work with the same structure YAML.

8. **The story is the source of truth.** Agents may have opinions, but the Markdown+YAML files on disk are what matters. Agents read from and write to the same files.

9. **Phase progression is a state machine.** The orchestrator tracks the current phase. Events drive transitions. Agents cannot skip phases.

---

## 10. Context Management Strategy

> **Critical gap identified by Metis**: Long-form fiction (80K+ words) exceeds LLM context windows. Agents must work with compressed, focused views without losing global awareness.

### 10.1 Three-Tier Context Model

Inspired by memory hierarchy: hot (current scene), warm (current chapter/act), cold (full story).

```
┌─────────────────────────────────────────────────────────┐
│                COLD STORE (Full Story)                    │
│  All project files on disk. Accessed via file reads.      │
│  Token cost: high. Used sparingly.                       │
├─────────────────────────────────────────────────────────┤
│                WARM STORE (Active Context)                 │
│  Current chapter + summaries + Bible snapshots.           │
│  Token cost: moderate. Refreshed per-phase.              │
├─────────────────────────────────────────────────────────┤
│                HOT STORE (Agent Working Memory)            │
│  Current scene prose + metadata + agent's own eval task.  │
│  Token cost: low. Fits in model context window.          │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Context Window Allocation Per Agent

Not every agent needs every scene. Allocate context based on the agent's role:

| Agent | Hot (Scene) | Warm (Chapter) | Cold (Story) | Strategy |
|-------|------------|----------------|--------------|----------|
| **Writer** | Full scene prose + scene summary | Chapter summary + character states | Bible snippets (character arcs for POV) | Generous — needs narrative flow |
| **Editor** | Full scene prose | None | None | Line-level only |
| **Critic** | Scene prose + metadata | Chapter summaries + structure progress | Story premise + thematic statement | Holistic — needs warm context |
| **Narratologist** | Scene metadata + Markov transition scores + constraint violations | Beat completion report + history | Structure definition file (YAML) | Structure-aware, not prose-aware |
| **Character Consistency** | Scene prose (character parts) + Bible diff | Character state changes | Full character entries for POV characters | Targeted — only relevant characters |
| **Fact-Checker** | Claims extracted from scene | Timeline + fact DB | Full timeline | Facts only |
| **Pacing Analyst** | Scene word count + tension metadata | Chapter-level pacing metrics | Structure tension curve | Metrics-only — no prose |
| **World-building** | Location mentions + item changes | Location state changes | Full location entries for active locations | Locations only |
| **Narrative Consistency** | Scene metadata + thread changes | All plot thread states | All dramatic questions | Thread-global |
| **Thematic Coherence** | Scene purpose + motifs | Theme progression | Premise + controlling idea | Theme-only |
| **Dialogist** | Dialogue-only extract from scene | Character voice profiles | Voice archetype references | Dialogue-only |
| **Stylesheet** | Style markers (POV, tense, register) | Deviation log | Style guide definition | Style-only |
| **Mood/Tension Curator** | Tension metadata + mood tags | Emotional arc graph | Tension curve from structure | Metrics + structure |
| **Ideator** | Scene description (1-sentence) | Chapter summary | Story premise | Minimal — creativity needs room |
| **Researcher** | None (triggered by fact gaps) | Research queue | Research repository | On-demand |
| **Localizer** | Cultural markers extracted from scene | Cultural settings | Cultural reference DB | On-demand |

### 10.3 Scene Condensation Protocol

When an agent needs to review multiple scenes (e.g., Character Consistency checking across a chapter), scenes are condensed:

```typescript
interface SceneCondenser {
  // Produce a condensed version of a scene for cross-scene review
  condense(scene: SceneDocument, forAgent: string): CondensedScene;

  // Condense a chapter worth of scenes into a single context
  condenseChapter(chapter: Chapter, forAgent: string): CondensedChapter;
}

type CondensedScene = {
  // Always included
  id: string;
  wordCount: number;
  metadata: SceneMetadata;                // Full metadata

  // Agent-specific — only what that agent needs
  prose: string | null;                   // Full prose or null
  proseSummary: string | null;            // 2-3 sentence summary
  characterExcerpts: Map<string, string>; // Character-specific lines
  dialogueOnly: string | null;            // Dialogue transcript
  claimsExtracted: string[];              // Factual claims
  styleViolations: string[];              // Style guide flags

  // Cross-reference
  bibleDiffs: BibleDiff[];                // What changed since last scene
};
```

### 10.4 Checkpoint Compression

After each chapter completes, the system produces a **compressed story state** for long-range context:

```typescript
interface CompressedStoryState {
  // ~2K tokens — enough for any agent to understand current state
  summary: string;                        // What happened so far (2-3 paragraphs)
  characterStatuses: Array<{
    id: string;
    status: string;                       // "active", "departed", "off-stage"
    currentArcPhase: string;
    keyEvents: string[];                  // Bullet-list of significant events
  }>;
  unresolvedThreads: string[];
  dramaticQuestions: string[];            // Still-open questions
  structureProgress: string;              // e.g., "65% through Hero's Journey, currently in 'Approach to the Inmost Cave'"
  tensionSummary: string;                 // "Tension rising from 5→7, peak expected at 75%"
  thematicStatus: string;                 // How the controlling idea is developing
  pendingPromises: string[];              // What the story owes the reader
}
```

### 10.5 Agent Prompt Structure

Each agent gets a structured prompt composed at invocation time:

```
[SYSTEM] Agent role definition + evaluation criteria + style guide
[CONTEXT] Compressed story state (warm) + condensed scene (hot)
[STORY BIBLE] Relevant Bible excerpts (targeted, not full)
[NARRATIVE STRUCTURE] Current beat + tension expectations
[TASK] "Evaluate this scene for {dimension}. Return structured evaluation."
```

This avoids:
- ❌ Dumping full story into every agent's context
- ❌ Agents making claims about parts of the story they haven't seen
- ❌ Token waste on prose that an agent doesn't need to read

---

## 11. Success Criteria

### Verification
- [ ] All 16 agents defined with interface contracts
- [ ] Scene evaluation metadata schema specified (11 fields)
- [ ] **Markov chain guidance interface** defined (predictNext, scoreTransition, evaluateConstraints)
- [ ] **Constraint system** defined (5 constraint types: order, count, distance, reference, tension)
- [ ] **Markov inference engine** defined (n-order transition matrix, Monte Carlo simulation)
- [ ] 12 structure plugins listed with transition probabilities and constraints
- [ ] Position-based beat model **removed** (no min/max/ideal percentages in structure definitions)
- [ ] Mailbox protocol specified (11 message types)
- [ ] Pipeline state machine defined (6 phases + transitions)
- [ ] HarnessAdapter interface specified (4 lifecycle methods)
- [ ] Capability tier system defined (5 categories, 3 levels each)
- [ ] Interview protocol specified (9 dimensions + depth assessment)
- [ ] Harness adapters mapped for OpenCode, Codex, Claude Code, standalone
- [ ] Data model: Story project directory structure specified

### Resolved by Architecture Review
The following questions from the initial draft have been addressed during the Metis gap analysis and are now part of the design:

| Original Question / Refinement | Resolved In | Resolution |
|-------------------------------|-------------|------------|
| How do agents handle partial approval (mixed pass/fail)? | §6.3, §6.4 | Weighted voting (§6.4), "good enough" evaluation thresholds (§6.3), deferred minor issues |
| What is the Writer's revision budget before escalation? | §6.3 | Max 5 revisions per scene, relaxed evaluation at attempt 3, escalation at 6+ |
| How do we handle conflicting agent recommendations? | §6.4 | Escalation ladder: weighted voting → lead-agent adjudication → human-in-loop |
| What is the token budget for the interview phase? | §6.3 | Configurable via `IterationBudget.maxTokensPerScene` + `maxApiCallsPerPhase`. Deployment-specific defaults. |
| **Replace fixed-position beats with Markov chain + constraints** | §3 (all) | Beat positions replaced with transition probabilities. 5 constraint types (ordering, occurrence, distance, reference, tension). Variable-order Markov with Monte Carlo simulation for path prediction. |
| **No raw material ingestion pipeline** (user has notes/drafts/research that the system needs to consume) | §1.5 | Phase 0 (Material Ingestion): user dumps into `raw-inputs/`, Archivist (Organizing Agent 17) processes into interlinked wiki (`story/wiki/`). |
| **No wiki / shared knowledge base** — agents lack a common reference that's human-readable | §1.5.2 | Karpathy-style LLM-maintained wiki: markdown pages with YAML frontmatter, `index.md`/`log.md`, organized subdirectories. |
| **Rigid acts/chapters/scenes filesystem hierarchy** — we can't know the structure in advance | §1.1, §1.2.3 | Flattened to `story/scenes/` with individual scene files. Chapter is a thin `chapters.yaml` that references scenes by ID (yWriter7 pattern). |
| **Wiki vs Bible data duplication** — two stores for the same knowledge, sync risk | §1.4, §1.5 | Wiki is the single durable source of truth. Bible is an in-memory cache only, populated from wiki on startup. `story/bible/` directory eliminated. |
| **Bible persistence choice** — in-memory or file-backed? | §1.4 | **Decided**: Bible is in-memory only. Wiki is the durable store. Removed the open question. |

### Remaining Open Questions
These require implementation-phase decisions and are deliberately not fixed at the architecture level:

1. **How are model capability tiers discovered at runtime?** — Options: static config (`writer.yaml`), runtime probing (API metadata), or hybrid (config with auto-fallback). Implementation decision.
2. **What is the scene-level file-size limit?** — Deployment concern tied to model context windows. Default recommendation: 4K words per scene (≈25K tokens with metadata). Configurable.

---

*Architecture Blueprint v1.5 — Generated by Prometheus. Metis gap analysis: Story Bible (§1.4), Iteration Budget (§6.5), Conflict Resolution (§6.6), Context Management (§10). Post-review refinements: Markov chain + constraint system (§3); pipeline redesigned (§6); Phase 0 Material Ingestion (§1.5); Archivist (Agent 17) (§2.2); yWriter7 data model analysis + flat scene hierarchy (§1.2); wiki as single source of truth, Bible as in-memory cache (§1.4-1.5).*
