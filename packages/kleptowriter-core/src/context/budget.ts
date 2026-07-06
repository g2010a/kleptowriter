export interface ContextItem {
  id: string;
  content: string;
  priority: number;
  estimatedTokens: number;
  category: "scene" | "summary" | "character" | "plot-thread" | "note";
}

export class ContextWindowBudget {
  private maxTokens: number;

  constructor(maxTokens = 4000) {
    this.maxTokens = this.normalizeBudget(maxTokens);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  fitWithinBudget(items: ContextItem[]): ContextItem[] {
    const selected: ContextItem[] = [];
    let usedTokens = 0;

    for (const item of [...items].sort((a, b) => b.priority - a.priority || this.tokensFor(b) - this.tokensFor(a))) {
      const tokens = this.tokensFor(item);

      if (usedTokens + tokens > this.maxTokens) {
        continue;
      }

      selected.push(item);
      usedTokens += tokens;
    }

    return selected;
  }

  setBudget(maxTokens: number): void {
    this.maxTokens = this.normalizeBudget(maxTokens);
  }

  getBudget(): number {
    return this.maxTokens;
  }

  private tokensFor(item: ContextItem): number {
    return Number.isFinite(item.estimatedTokens) && item.estimatedTokens > 0
      ? Math.ceil(item.estimatedTokens)
      : this.estimateTokens(item.content);
  }

  private normalizeBudget(maxTokens: number): number {
    if (!Number.isFinite(maxTokens) || maxTokens < 0) {
      throw new Error("Context window budget must be a non-negative finite number");
    }

    return Math.floor(maxTokens);
  }
}
