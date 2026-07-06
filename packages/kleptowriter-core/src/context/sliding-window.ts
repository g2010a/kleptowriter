import type { SceneDocument } from "../data-model/scene/index.js";

export interface WindowEntry {
  scene: SceneDocument;
  summary?: string;
  index: number;
}

export class SlidingWindowManager {
  private readonly maxSize: number;
  private readonly entries: WindowEntry[] = [];
  private readonly archived: WindowEntry[] = [];

  constructor(maxSize = 5) {
    this.maxSize = Math.max(1, Math.trunc(maxSize));
  }

  add(scene: SceneDocument): void {
    this.entries.push({ scene, index: this.archived.length + this.entries.length });

    while (this.entries.length > this.maxSize) {
      const entry = this.entries.shift();
      if (entry) this.archived.push(entry);
    }
  }

  getWindow(): WindowEntry[] {
    return [...this.entries];
  }

  getArchived(): WindowEntry[] {
    return [...this.archived];
  }

  getAll(): WindowEntry[] {
    return [...this.archived, ...this.entries];
  }

  getCurrent(): SceneDocument | undefined {
    return this.entries.at(-1)?.scene;
  }

  size(): number {
    return this.entries.length;
  }

  reset(): void {
    this.entries.length = 0;
    this.archived.length = 0;
  }
}
