/**
 * Kleptowriter — Basic Pipeline Example
 *
 * Demonstrates the full API surface: story bible, mailbox, agents,
 * scenes, Markov inference, evaluation, context management, pipeline
 * orchestration, and more.
 *
 * Run:  bun run examples/basic-pipeline.ts
 * Typecheck:  bun run typecheck
 */

// ── Barrel imports (what @kleptowriter/kleptowriter-core re-exports) ─
import {
  // Data model / bible
  InMemoryStoryBible,
  PlotThreadTracker,
  DramaticQuestionTracker,
  ArcTrackerImpl,
  ThematicProgressionImpl,
  type SceneDocument,
  SceneStatus,
  writeScene,
  readScene,
  serializeScene,
  parseScene,
  // Mailbox
  Mailbox,
  // Agent system
  AgentRole,
  BaseAgent,
  AgentRegistry,
  type LiteraryAgent,
  type AgentContext,
  type CapabilityTier,
  // Markov engine
  MarkovInferenceEngine,
  MarkovPathPredictor,
  type Transition,
  type TransitionCandidate,
  type PathDistribution,
  // Context
  CheckpointManager,
  SlidingWindowManager,
  ContextWindowBudget,
  TieredMemory,
  CondensationStrategy,
  // Pipeline
  PipelineOrchestrator,
  PipelinePhase,
  type PhaseContext,
  InterviewProtocol,
  ChapterDeductor,
  BibleUpdateProtocol,
  type BibleUpdate,
  IterationBudget,
  defaultBudgetConfig,
  ConflictResolution,
  ScenePlanGate,
  SceneProseGate,
  // Wiki
  parseWikiPageContent,
  WikiLinkExtractor,
  WikiPageType,
  WikiToBiblePopulation,
} from "@kleptowriter/kleptowriter-core";

// ── Deep imports (not in barrel, available via path alias) ──────────
import { NoteCollector } from "@kleptowriter/kleptowriter-core/eval/notes.js";
import type { AgentNote } from "@kleptowriter/kleptowriter-core/eval/notes.js";
import { SceneExtractor } from "@kleptowriter/kleptowriter-core/eval/extractor.js";
import { SceneDatastore } from "@kleptowriter/kleptowriter-core/eval/datastore.js";
import { MetadataDiff } from "@kleptowriter/kleptowriter-core/eval/metadata-diff.js";
import type { MetadataDiffResult } from "@kleptowriter/kleptowriter-core/eval/metadata-diff.js";
import { saveReport, loadReports } from "@kleptowriter/kleptowriter-core/eval/reports.js";
import type { NarratologistReport } from "@kleptowriter/kleptowriter-core/eval/reports.js";
import { CrossAgentQueryRouter } from "@kleptowriter/kleptowriter-core/eval/cross-agent-queries.js";
import { MarkovStructureGuidanceImpl } from "@kleptowriter/kleptowriter-core/narrative/guidance.js";
import { ConstraintChecker } from "@kleptowriter/kleptowriter-core/narrative/constraints/checker.js";

// ── Node stdlib ─────────────────────────────────────────────────────
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// ═════════════════════════════════════════════════════════════════════
//  1.  STORY BIBLE — the central knowledge base
// ═════════════════════════════════════════════════════════════════════

console.log("═══ 1. Story Bible ═══");

const bible = new InMemoryStoryBible();

// Add characters
bible.characters.set("ada", {
  id: "ada",
  name: "Ada",
  aliases: ["Ada Lovelace"],
  tags: ["protagonist", "mathematician"],
  traits: { occupation: "mathematician", personality: "curious" },
  relationships: new Map([["ben", "collaborator"]]),
  knowledge: new Set(["mathematics", "poetry"]),
  arcBeatIds: [],
});

bible.characters.set("ben", {
  id: "ben",
  name: "Ben",
  aliases: ["Babbage"],
  tags: ["protagonist", "inventor"],
  traits: { occupation: "inventor", personality: "methodical" },
  relationships: new Map([["ada", "collaborator"]]),
  knowledge: new Set(["engineering", "clockwork"]),
  arcBeatIds: [],
});

// Add locations
bible.locations.set("library", {
  id: "library",
  name: "Library",
  aliases: ["The Great Library"],
  tags: ["indoor", "knowledge"],
  description: "A vast library filled with ancient texts.",
  relatedLocations: [],
});

bible.locations.set("garden", {
  id: "garden",
  name: "Garden",
  aliases: ["Botanical Garden"],
  tags: ["outdoor", "nature"],
  description: "A serene garden with winding paths.",
  relatedLocations: [],
});

// Add a plot thread
bible.plotThreads.set("mystery", {
  id: "mystery",
  name: "The Lost Manuscript",
  description: "Ada and Ben search for a lost manuscript.",
  status: "introduced",
  relatedSceneIds: [],
});

// Use the knowledge graph
bible.knowledgeState.learn("ada", "manuscript_location", "scene-001");
console.log("  Bible characters:", bible.characters.size);
console.log("  Bible locations:", bible.locations.size);
console.log("  Bible plot threads:", bible.plotThreads.size);
console.log("  Ada knows manuscript_location:", bible.knowledgeState.knows("ada", "manuscript_location"));

// ── Bible-adjacent trackers (also available standalone) ─────────────
const threadTracker = new PlotThreadTracker();
threadTracker.introduce("mystery", "The Lost Manuscript", "Ada and Ben search for a lost manuscript.");
console.log("  Thread tracker active threads:", threadTracker.getActiveThreads().length);

const questionTracker = new DramaticQuestionTracker();
questionTracker.raise("q1", "Will they find the manuscript?", "scene-001");
console.log("  Open questions:", questionTracker.getOpenQuestions().length);

const arcTracker = new ArcTrackerImpl("arc-1", "Discovery Arc", "The journey of discovery", ["beat-1", "beat-2", "beat-3"]);
arcTracker.completeBeat("beat-1");
console.log("  Arc progress:", arcTracker.getProgress());

const tp = new ThematicProgressionImpl();
tp.recordIntensity("knowledge", "scene-001", 8);
console.log("  Theme intensity (knowledge):", tp.getIntensity("knowledge"));

// ═════════════════════════════════════════════════════════════════════
//  2.  MAILBOX & AGENT REGISTRY
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 2. Mailbox & Agent Registry ═══");

const mailbox = new Mailbox();
const registry = new AgentRegistry(mailbox);

// Create concrete agents via BaseAgent
class WriterAda extends BaseAgent {
  constructor() { super({ id: "writer-ada", role: AgentRole.Writer, capabilityTier: ["prose-gen", "creativity"] as CapabilityTier[], mode: "generation" }); }
}
class CriticBen extends BaseAgent {
  constructor() { super({ id: "critic-ben", role: AgentRole.Critic, capabilityTier: ["evaluation", "analysis"] as CapabilityTier[], mode: "evaluation" }); }
}
class ResearcherEve extends BaseAgent {
  constructor() { super({ id: "researcher-eve", role: AgentRole.Researcher, capabilityTier: ["research", "analysis"] as CapabilityTier[], mode: "research" }); }
}
class FactCheckerOscar extends BaseAgent {
  constructor() { super({ id: "factchecker-oscar", role: AgentRole.FactChecker, capabilityTier: ["fact-checking", "analysis"] as CapabilityTier[], mode: "evaluation" }); }
}

registry.register(new WriterAda());
registry.register(new CriticBen());
registry.register(new ResearcherEve());
registry.register(new FactCheckerOscar());

console.log("  Registered agents:", registry.getAllAgents().length);
console.log("  Resolve Writer:", registry.resolve(AgentRole.Writer)?.id);

// Mailbox messaging
const msg = mailbox.deliver(
  { agentId: "critic-ben" },
  { type: "evaluation", from: { agentId: "writer-ada" }, to: { agentId: "critic-ben" }, payload: { sceneId: "scene-001" } },
);
console.log("  Delivered message:", msg.id);
console.log("  Polled:", mailbox.poll("critic-ben").length);
console.log("  Broadcast:", mailbox.broadcast("system", "broadcast", { event: "phase_start" }).length, "msgs");

// ═════════════════════════════════════════════════════════════════════
//  3.  SCENES — create, write, read, parse
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 3. Scenes ═══");

const sceneDir = join(import.meta.dir, "../tmp/scenes");
mkdirSync(sceneDir, { recursive: true });

const scene1: SceneDocument = {
  id: "scene-001",
  title: "The Discovery",
  status: SceneStatus.Draft,
  metadata: {
    pov: "ada",
    characters: ["ada", "ben"],
    locations: ["library"],
    chronology: "1843-01-15T10:00:00Z",
    tension: 7,
    mood: "mysterious",
    plotThreads: ["mystery"],
    thematicMotifs: ["knowledge", "discovery"],
    dramaticQuestions: ["q1"],
  },
  prose: [
    'Ada turned the brittle page. "Ben, look — the missing folio."',
    'Ben leaned closer. "The proof. It\'s real."',
    "Rain streaked the windows. Neither noticed.",
    '"We must verify the lemma," Ada whispered.',
  ].join("\n\n"),
  customFields: { chapter: 1 },
};

await writeScene(join(sceneDir, "scene-001.md"), scene1);
const readResult = await readScene(join(sceneDir, "scene-001.md"));
console.log("  Scene read back:", readResult.ok);
if (readResult.ok) console.log("  Title:", readResult.data.title);

// Roundtrip via serialize/parse
const parsed = parseScene(serializeScene(scene1));
console.log("  Serialize/parse roundtrip:", parsed.ok);

// ═════════════════════════════════════════════════════════════════════
//  4.  EVALUATION SYSTEM
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 4. Evaluation System ═══");

const extractor = new SceneExtractor();
const meta = extractor.extract(scene1, bible);
console.log("  Extracted POV:", meta.pov, "| tension:", meta.tension, "| mood:", meta.mood);

const datastore = new SceneDatastore();
datastore.store(scene1);
console.log("  Stored:", datastore.getAll().length, "| By Ada:", datastore.getScenesByCharacter("ada").length);

const collector = new NoteCollector();
collector.addNote({ id: "n1", agentId: "critic-ben", sceneId: "scene-001", note: "Raise tension.", severity: "warning", category: "prose", timestamp: Date.now() });
collector.addNote({ id: "n2", agentId: "researcher-eve", sceneId: "scene-001", note: "Verify folio ref.", severity: "info", category: "research", timestamp: Date.now() });
console.log("  Notes:", collector.collectNotes("scene-001").length, "| Total:", collector.aggregate().total);

// MetadataDiff
const scene2: SceneDocument = {
  id: "scene-002",
  title: "The Garden",
  status: SceneStatus.Draft,
  metadata: {
    pov: "ben",
    characters: ["ben"],
    locations: ["garden"],
    chronology: "1843-01-16T14:00:00Z",
    tension: 5,
    mood: "reflective",
    plotThreads: ["mystery"],
    thematicMotifs: ["nature"],
    dramaticQuestions: ["q1"],
  },
  prose: "Ben walked through the garden, the library encounter fresh in his mind.",
  customFields: {},
};

const diffResult: MetadataDiffResult = new MetadataDiff().diff(scene1.metadata, scene2.metadata);
console.log("  Diff — new chars:", diffResult.newCharacters, "| missing:", diffResult.missingCharacters, "| tension delta:", diffResult.tensionDelta);

// Reports persistence
const reportsDir = join(import.meta.dir, "../tmp/reports");
const report: NarratologistReport = {
  agentId: "critic-ben", role: "narratologist", sceneId: "scene-001",
  verdict: "pass", score: 85, confidence: 0.75,
  findings: [{ category: "structure", severity: "info", message: "Well-structured." }],
  timestamp: Date.now(), summary: "Good scene.",
  structureScore: 8, plotCoherenceScore: 9, genreAlignment: "mystery",
};
await saveReport(report, reportsDir);
const loaded = await loadReports("scene-001", reportsDir);
console.log("  Reports saved/loaded:", loaded.length);

// Cross-agent queries
const router = new CrossAgentQueryRouter(bible, registry);
const qr = router.execute({ queryId: "q1", fromAgent: "writer-ada", toAgent: "critic-ben", type: "character-state", params: { characterId: "ada" }, timestamp: Date.now() });
console.log("  Cross-agent query OK:", qr.success);

// ═════════════════════════════════════════════════════════════════════
//  5.  MARKOV — narrative transitions
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 5. Markov Inference Engine ═══");

const engine = new MarkovInferenceEngine();
engine.train([
  { from: "setup", to: "discovery", weight: 3 },
  { from: "discovery", to: "pursuit", weight: 2 },
  { from: "discovery", to: "revelation", weight: 2 },
  { from: "pursuit", to: "climax", weight: 3 },
  { from: "revelation", to: "resolution", weight: 4 },
  { from: "setup", to: "callback", weight: 1, context: ["clue"] },
]);

console.log("  Order:", engine.getOrder());
const probs = engine.getTransitionProbabilities("discovery");
console.log("  From 'discovery':", [...probs].map(([b, p]) => `${b}(${(p * 100).toFixed(0)}%)`).join(" "));
console.log("  Predict (2nd order):", engine.predictNext({ currentBeat: "setup", history: ["clue"] }).map(c => `${c.beat}(${(c.probability * 100).toFixed(0)}%)`).join(" "));

const predictor = new MarkovPathPredictor(engine);
console.log("  Most likely path:", predictor.mostLikelyPath("setup", 3).join(" -> "));

// ═════════════════════════════════════════════════════════════════════
//  6.  CONTEXT MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 6. Context Management ═══");

const cm = new CheckpointManager("/tmp/klepto-checkpoints");
cm.save({ phase: "scene-loop", currentSceneIndex: 1, bibleVersion: 2, completedBeatIds: ["b1"], sceneOrder: ["s1"], metadata: {} });
cm.save({ phase: "scene-loop", currentSceneIndex: 2, bibleVersion: 3, completedBeatIds: ["b1", "b2"], sceneOrder: ["s1", "s2"], metadata: {} });
console.log("  Checkpoints:", cm.list().length, "| Latest phase:", cm.latest()?.phase);

const sw = new SlidingWindowManager(3);
sw.add(scene1); sw.add(scene2);
console.log("  Sliding window size:", sw.size(), "| Current:", sw.getCurrent()?.title);

const ctxBudget = new ContextWindowBudget(2000);
const fitted = ctxBudget.fitWithinBudget([
  { id: "s1", content: scene1.prose, priority: 10, estimatedTokens: 100, category: "scene" as const },
  { id: "sum", content: "Summary", priority: 8, estimatedTokens: 30, category: "summary" as const },
]);
console.log("  Budget fitted:", fitted.length, "/ 2 items");

const tm = new TieredMemory();
tm.setCurrentScene(scene1);
tm.addSummary("scene-001", "Discovery in the library.");
console.log("  Tiered memory hot:", tm.getHot().recentScenes.length, "| warm:", tm.query("warm", "scene-001"));

const condenser = new CondensationStrategy();
console.log("  Condensed (bullet):", condenser.condense(scene1, "bullet").content.replace(/\n/g, "; "));
console.log("  Condensed (keyword):", condenser.condense(scene1, "keyword").content);

// ═════════════════════════════════════════════════════════════════════
//  7.  PIPELINE COMPONENTS
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 7. Pipeline Components ═══");

const orch = new PipelineOrchestrator({ bible, registry, currentSceneIndex: 0, maxScenes: 5 });
console.log("  MaterialIngestion:", orch.runPhase(PipelinePhase.MaterialIngestion).status);
console.log("  Interview:", orch.runPhase(PipelinePhase.Interview).status);
console.log("  SceneLoop:", orch.runPhase(PipelinePhase.SceneLoop).status);
console.log("  Revision:", orch.runPhase(PipelinePhase.Revision).status);
console.log("  Complete:", orch.isComplete());

const interview = new InterviewProtocol(registry.getAllAgents());
const answers = new Map<string, string>([
  ["character-core-wound", "Curiosity drives Ada."],
  ["plot-conflict", "The manuscript is missing."],
  ["theme-question", "What is knowledge worth?"],
  ["setting-pressure", "1840s London."],
  ["tone-promise", "Tense mystery."],
]);
console.log("  Interview depth:", interview.runInterview(answers).overallDepthScore);

const deductor = new ChapterDeductor();
console.log("  Chapters:", deductor.deduce([scene1, scene2], { bible }).length);

const updater = new BibleUpdateProtocol(bible, "last-writer-wins", mailbox);
const ur = updater.applyUpdate({
  timestamp: Date.now(), agentId: "writer-ada",
  changes: {
    characters: new Map([["ben", { traits: { ...(bible.characters.get("ben")?.traits ?? {}), mood: "contemplative" } }]]),
    plotThreads: new Map([["mystery", { relatedSceneIds: ["scene-001"] }]]),
  },
});
console.log("  Bible update applied:", ur.applied, "| version:", ur.newVersion);

const cr = new ConflictResolution();
const vr = cr.resolveViaWeightedVoting({
  votes: [
    { agentId: "critic-ben", verdict: "pass", confidence: 8, reasoning: "Coherent." },
    { agentId: "researcher-eve", verdict: "conditional", confidence: 6, reasoning: "Check detail." },
  ],
  weights: new Map([["critic-ben", 3], ["researcher-eve", 1]]),
});
console.log("  Weighted vote:", vr.verdict, vr.score);

const ib = new IterationBudget(defaultBudgetConfig);
console.log("  Budget revisions remaining:", ib.remaining("revisions"));

const pg = new ScenePlanGate();
console.log("  Plan gate:", pg.evaluate({
  beatId: "discovery", purpose: "Find the clue.", suggestedPov: "ada",
  suggestedCharacters: ["ada", "ben"], targetTension: 7,
  plotThreads: ["mystery"], dramaticQuestions: ["q1"], thematicMotifs: ["knowledge"],
}, bible).verdict);

const sg = new SceneProseGate();
console.log("  Prose gate:", sg.evaluate(scene1, bible, 0).verdict);

// ═════════════════════════════════════════════════════════════════════
//  8.  NARRATIVE GUIDANCE
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 8. Narrative Guidance ═══");

const guidance = new MarkovStructureGuidanceImpl(engine, new ConstraintChecker(), predictor);
guidance.advanceBeat("setup", 3);
guidance.advanceBeat("discovery", 7);
console.log("  Current beat:", guidance.getCurrentBeat());
console.log("  Next candidates:", guidance.getNextBeatCandidates().map((c) => c.beat).join(", "));
console.log("  Progress:", guidance.getStoryProgress());

// ═════════════════════════════════════════════════════════════════════
//  9.  WIKI
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ 9. Wiki System ═══");

const wiki = [
  "---\ntype: character\nname: Ada Lovelace\naliases:\n  - Ada\ntags:\n  - protagonist\n  - mathematician\nrelatedPages:\n  - charles-babbage\n---",
  "Ada Lovelace is a mathematician and writer.",
].join("\n");
const wpr = parseWikiPageContent(wiki, "ada.md");
if (wpr.ok) console.log("  Wiki page:", wpr.data.name, "| type:", wpr.data.type === WikiPageType.Character ? "Character" : "?");

const links = WikiLinkExtractor.extractLinks("Meet [[ada]] in [[library]].");
console.log("  Wiki links:", links.length);

const pop = new WikiToBiblePopulation();
if (wpr.ok) console.log("  Entities created:", pop.populate([wpr.data], bible).entitiesCreated);

// ═════════════════════════════════════════════════════════════════════
//  ✅  DONE
// ═════════════════════════════════════════════════════════════════════

console.log("\n═══ ✅ Demo Complete ═══");
console.log("  Bible version:", bible.version);
