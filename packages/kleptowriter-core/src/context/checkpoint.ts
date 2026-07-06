export interface Checkpoint {
  id: string;
  timestamp: number;
  phase: string;
  currentSceneIndex: number;
  bibleVersion: number;
  completedBeatIds: string[];
  sceneOrder: string[];
  metadata: Record<string, unknown>;
}

export class CheckpointManager {
  private nextId = 1;
  private readonly checkpointDir: string;
  private readonly checkpoints: Map<string, Checkpoint> = new Map();

  constructor(checkpointDir: string) {
    this.checkpointDir = checkpointDir;
  }

  save(checkpoint: Omit<Checkpoint, "id" | "timestamp">): Checkpoint {
    const saved: Checkpoint = {
      ...checkpoint,
      id: `checkpoint-${this.nextId++}`,
      timestamp: Date.now(),
      completedBeatIds: [...checkpoint.completedBeatIds],
      sceneOrder: [...checkpoint.sceneOrder],
      metadata: { ...checkpoint.metadata },
    };

    this.checkpoints.set(saved.id, saved);
    return { ...saved, completedBeatIds: [...saved.completedBeatIds], sceneOrder: [...saved.sceneOrder], metadata: { ...saved.metadata } };
  }

  load(id: string): Checkpoint | undefined {
    const checkpoint = this.checkpoints.get(id);
    return checkpoint === undefined ? undefined : this.copy(checkpoint);
  }

  list(): Checkpoint[] {
    return [...this.checkpoints.values()].map((checkpoint) => this.copy(checkpoint));
  }

  latest(): Checkpoint | undefined {
    return this.list().at(-1);
  }

  prune(keep: number): void {
    const removeCount = Math.max(0, this.checkpoints.size - Math.max(0, keep));
    for (const id of [...this.checkpoints.keys()].slice(0, removeCount)) {
      this.checkpoints.delete(id);
    }
  }

  clear(): void {
    this.checkpoints.clear();
  }

  private copy(checkpoint: Checkpoint): Checkpoint {
    return {
      ...checkpoint,
      completedBeatIds: [...checkpoint.completedBeatIds],
      sceneOrder: [...checkpoint.sceneOrder],
      metadata: { ...checkpoint.metadata },
    };
  }
}
