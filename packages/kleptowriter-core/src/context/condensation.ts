import type { SceneDocument } from "../data-model/scene/index.js";

export type CondensationTier = "full" | "summary" | "bullet" | "keyword";

export interface SceneSummary {
  sceneId: string;
  title: string;
  tier: CondensationTier;
  content: string;
  originalTokens: number;
  condensedTokens: number;
}

const countTokens = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const sentenceFragments = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const list = (label: string, values: readonly string[]): string | undefined =>
  values.length > 0 ? `${label}: ${values.join(", ")}` : undefined;

export class CondensationStrategy {
  condense(scene: SceneDocument, tier: CondensationTier = "bullet"): SceneSummary {
    const content = this.contentFor(scene, tier);

    return {
      sceneId: scene.id,
      title: scene.title,
      tier,
      content,
      originalTokens: countTokens(scene.prose),
      condensedTokens: countTokens(content),
    };
  }

  private toSummary(scene: SceneDocument): string {
    return [
      `Title: ${scene.title}`,
      list("Characters", scene.metadata.characters),
      list("Locations", scene.metadata.locations),
      list("Threads", scene.metadata.plotThreads),
      `Summary: ${scene.prose.trim().slice(0, 500)}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }

  private toBullets(scene: SceneDocument): string {
    const metadata = [
      list("Characters", scene.metadata.characters),
      list("Locations", scene.metadata.locations),
      list("Threads", scene.metadata.plotThreads),
      list("Themes", scene.metadata.thematicMotifs),
    ].filter((line): line is string => Boolean(line));
    const events = sentenceFragments(scene.prose).slice(0, Math.max(1, 5 - metadata.length));

    return [...metadata, ...events].slice(0, 5).map((line) => `- ${line}`).join("\n");
  }

  private toKeywords(scene: SceneDocument): string {
    return [
      scene.title,
      ...scene.metadata.characters,
      ...scene.metadata.locations,
      ...scene.metadata.plotThreads,
      ...scene.metadata.thematicMotifs,
    ].join(", ");
  }

  private contentFor(scene: SceneDocument, tier: CondensationTier): string {
    switch (tier) {
      case "full":
        return scene.prose;
      case "summary":
        return this.toSummary(scene);
      case "bullet":
        return this.toBullets(scene);
      case "keyword":
        return this.toKeywords(scene);
    }
  }
}
