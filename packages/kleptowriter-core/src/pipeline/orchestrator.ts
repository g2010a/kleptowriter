import type { AgentRegistry } from "../agents/registry.js";
import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { MarkovStructureGuidance } from "../narrative/guidance.js";

export enum PipelinePhase {
  MaterialIngestion = "material-ingestion",
  Interview = "interview",
  SceneLoop = "scene-loop",
  Revision = "revision",
}

export interface PhaseContext {
  bible: StoryBible;
  registry?: AgentRegistry;
  guidance?: MarkovStructureGuidance;
  currentSceneIndex: number;
  maxScenes: number;
}

export interface PhaseResult {
  phase: PipelinePhase;
  status: "success" | "failure" | "skipped";
  nextPhase: PipelinePhase | null;
  events: PipelineEvent[];
  error?: string;
}

export interface PipelineEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export class PipelineOrchestrator {
  private currentPhase: PipelinePhase | null = PipelinePhase.MaterialIngestion;
  private readonly phaseHistory: PhaseResult[] = [];

  constructor(private readonly context: PhaseContext) {}

  runPhase(phase: PipelinePhase): PhaseResult {
    const events: PipelineEvent[] = [];

    try {
      this.onEnter(phase, events);
      this.execute(phase, events);
      this.onExit(phase, events);

      const result: PhaseResult = {
        phase,
        status: "success",
        nextPhase: this.getNextPhase(phase),
        events,
      };

      this.phaseHistory.push(result);
      this.currentPhase = result.nextPhase;
      return result;
    } catch (error) {
      const result: PhaseResult = {
        phase,
        status: "failure",
        nextPhase: null,
        events,
        error: error instanceof Error ? error.message : String(error),
      };

      this.phaseHistory.push(result);
      this.currentPhase = phase;
      return result;
    }
  }

  getCurrentPhase(): PipelinePhase | null {
    return this.currentPhase;
  }

  getPhaseHistory(): PhaseResult[] {
    return [...this.phaseHistory];
  }

  isComplete(): boolean {
    const lastResult = this.phaseHistory.at(-1);
    return lastResult?.phase === PipelinePhase.Revision && lastResult.status === "success" && lastResult.nextPhase === null;
  }

  private onEnter(phase: PipelinePhase, events: PipelineEvent[]): void {
    this.record(events, `${phase}:enter`, this.contextSnapshot());
  }

  private execute(phase: PipelinePhase, events: PipelineEvent[]): void {
    switch (phase) {
      case PipelinePhase.MaterialIngestion:
        this.record(events, "wiki-ingestion:triggered", { characters: this.context.bible.characters.size });
        return;
      case PipelinePhase.Interview:
        this.record(events, "interview-protocol:triggered", { agentCount: this.context.registry?.getAllAgents().length ?? 0 });
        return;
      case PipelinePhase.SceneLoop:
        this.record(events, "scene-loop:triggered", {
          currentSceneIndex: this.context.currentSceneIndex,
          maxScenes: this.context.maxScenes,
          currentBeat: this.context.guidance?.getCurrentBeat(),
        });
        return;
      case PipelinePhase.Revision:
        this.record(events, "revision-pass:triggered", { storyProgress: this.context.guidance?.getStoryProgress() });
        return;
    }
  }

  private onExit(phase: PipelinePhase, events: PipelineEvent[]): void {
    this.record(events, `${phase}:exit`, { nextPhase: this.getNextPhase(phase) });
  }

  private getNextPhase(phase: PipelinePhase): PipelinePhase | null {
    switch (phase) {
      case PipelinePhase.MaterialIngestion:
        return PipelinePhase.Interview;
      case PipelinePhase.Interview:
        return PipelinePhase.SceneLoop;
      case PipelinePhase.SceneLoop:
        return PipelinePhase.Revision;
      case PipelinePhase.Revision:
        return null;
    }
  }

  private record(events: PipelineEvent[], type: string, data: Record<string, unknown>): void {
    events.push({ type, timestamp: Date.now(), data });
  }

  private contextSnapshot(): Record<string, unknown> {
    return {
      currentSceneIndex: this.context.currentSceneIndex,
      maxScenes: this.context.maxScenes,
      hasRegistry: this.context.registry !== undefined,
      hasGuidance: this.context.guidance !== undefined,
    };
  }
}
