import type { StoryBible } from "../data-model/bible/interfaces.js";
import type { SceneDocument, SceneMetadata } from "../data-model/scene/index.js";

const FIRST_PERSON = /\b(I|me|my|mine|myself)\b/i;
const EMOTIONAL_KEYWORDS = [
  "afraid",
  "anger",
  "angry",
  "betray",
  "blood",
  "danger",
  "desperate",
  "fear",
  "furious",
  "panic",
  "rage",
  "scream",
  "shock",
  "terror",
  "threat",
  "urgent",
];
const MOOD_KEYWORDS = ["afraid", "angry", "desperate", "eerie", "furious", "grim", "hopeful", "lonely", "tense", "urgent"];

export class SceneExtractor {
  extract(scene: SceneDocument, bible: StoryBible): SceneMetadata {
    return {
      pov: this.extractPov(scene),
      characters: this.extractCharacters(scene, bible),
      locations: this.extractLocations(scene),
      chronology: scene.metadata.chronology,
      tension: this.estimateTension(scene),
      mood: scene.metadata.mood ?? this.extractMood(scene),
      plotThreads: [...scene.metadata.plotThreads],
      thematicMotifs: [...scene.metadata.thematicMotifs],
      dramaticQuestions: [...scene.metadata.dramaticQuestions],
    };
  }

  private extractPov(scene: SceneDocument): string | undefined {
    return scene.metadata.pov ?? (FIRST_PERSON.test(scene.prose) ? "first-person" : undefined);
  }

  private extractCharacters(scene: SceneDocument, bible: StoryBible): string[] {
    const characters = new Set(scene.metadata.characters);

    for (const character of bible.characters.values()) {
      if (mentions(scene.prose, [character.name, ...character.aliases])) characters.add(character.id);
    }

    return [...characters];
  }

  private extractLocations(scene: SceneDocument): string[] {
    return [...scene.metadata.locations];
  }

  private estimateTension(scene: SceneDocument): number {
    const words = scene.prose.match(/\S+/g)?.length ?? 0;
    const keywordHits = EMOTIONAL_KEYWORDS.reduce((total, keyword) => total + countMentions(scene.prose, keyword), 0);
    return Math.min(10, Math.max(scene.metadata.tension ?? 1, 1 + Math.floor(words / 250) + keywordHits));
  }

  private extractTimeline(scene: SceneDocument): { scene?: number; chapter?: number } {
    const sceneNumber = numberField(scene.customFields.scene ?? scene.customFields.sceneNumber);
    const chapter = numberField(scene.customFields.chapter ?? scene.customFields.chapterNumber);

    return {
      ...(sceneNumber === undefined ? {} : { scene: sceneNumber }),
      ...(chapter === undefined ? {} : { chapter }),
    };
  }

  private extractMood(scene: SceneDocument): string | undefined {
    const moods = MOOD_KEYWORDS.filter((keyword) => mentions(scene.prose, [keyword]));
    return moods.length === 0 ? undefined : moods.join(", ");
  }
}

function mentions(text: string, terms: string[]): boolean {
  return terms.some((term) => term.trim() !== "" && new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text));
}

function countMentions(text: string, term: string): number {
  return text.match(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi"))?.length ?? 0;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
