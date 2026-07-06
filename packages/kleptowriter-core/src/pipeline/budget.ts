export interface BudgetConfig {
  maxRevisionsPerScene: number;
  maxTokensPerScene: number;
  maxApiCallsPerPhase: number;
  goodEnoughThresholds: Record<string, number>;
  circuitBreakerMaxFailures: number;
}

export const defaultBudgetConfig: BudgetConfig = {
  maxRevisionsPerScene: 5,
  maxTokensPerScene: 4000,
  maxApiCallsPerPhase: 100,
  goodEnoughThresholds: {
    narratologist: 6,
    "pacing-analyst": 5,
    "character-consistency": 6,
    "thematic-coherence": 5,
    worldbuilding: 4,
    dialogist: 5,
    stylesheet: 4,
    "mood-tension-curator": 5,
  },
  circuitBreakerMaxFailures: 3,
};

type BudgetResource = "revisions" | "tokens" | "api-calls";

const limits: Record<BudgetResource, keyof BudgetConfig> = {
  revisions: "maxRevisionsPerScene",
  tokens: "maxTokensPerScene",
  "api-calls": "maxApiCallsPerPhase",
};

export class IterationBudget {
  private used: Record<BudgetResource, number> = {
    revisions: 0,
    tokens: 0,
    "api-calls": 0,
  };

  private failures = 0;

  constructor(private config: BudgetConfig = defaultBudgetConfig) {}

  tryConsume(resource: BudgetResource, amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) {
      return false;
    }

    if (this.used[resource] + amount > this.limitFor(resource)) {
      return false;
    }

    this.used[resource] += amount;
    return true;
  }

  isExhausted(resource: BudgetResource): boolean {
    return this.remaining(resource) <= 0;
  }

  isGoodEnough(evaluatorRole: string, score: number): boolean {
    const threshold = this.config.goodEnoughThresholds[evaluatorRole];
    return threshold !== undefined && score >= threshold;
  }

  recordFailure(): void {
    this.failures += 1;
  }

  isCircuitBroken(): boolean {
    return this.failures >= this.config.circuitBreakerMaxFailures;
  }

  reset(): void {
    this.used.revisions = 0;
    this.used.tokens = 0;
    this.used["api-calls"] = 0;
    this.failures = 0;
  }

  remaining(resource: string): number {
    if (!this.isBudgetResource(resource)) {
      return 0;
    }

    return this.limitFor(resource) - this.used[resource];
  }

  private limitFor(resource: BudgetResource): number {
    return this.config[limits[resource]] as number;
  }

  private isBudgetResource(resource: string): resource is BudgetResource {
    return resource === "revisions" || resource === "tokens" || resource === "api-calls";
  }
}
