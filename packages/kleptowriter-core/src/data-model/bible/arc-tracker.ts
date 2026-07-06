import type { ArcTracker } from "./interfaces.js";

export class ArcTrackerImpl {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly beatIds: string[];

  #completedBeatIds = new Set<string>();

  constructor(id: string, name: string, description: string, beatIds: string[]) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.beatIds = [...beatIds];
  }

  completeBeat(beatId: string): void {
    if (!this.beatIds.includes(beatId)) {
      throw new Error(`Beat ${beatId} does not exist in arc ${this.id}`);
    }

    this.#completedBeatIds.add(beatId);
  }

  isBeatCompleted(beatId: string): boolean {
    return this.#completedBeatIds.has(beatId);
  }

  getProgress(): number {
    if (this.beatIds.length === 0) return 0;
    return this.#completedBeatIds.size / this.beatIds.length;
  }

  getRemainingBeats(): string[] {
    return this.beatIds.filter((beatId) => !this.#completedBeatIds.has(beatId));
  }

  getCompletedBeats(): string[] {
    return this.beatIds.filter((beatId) => this.#completedBeatIds.has(beatId));
  }

  toInterface(): ArcTracker {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      beatIds: [...this.beatIds],
      completedBeatIds: this.getCompletedBeats(),
      progress: this.getProgress(),
    };
  }
}
