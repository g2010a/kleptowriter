import type { SceneId } from "../../types/index.js";
import type { ThematicProgression, ThemeIntensity } from "./interfaces.js";

export class ThematicProgressionImpl implements ThematicProgression {
  themes = new Map<string, ThemeIntensity>();

  #sceneIntensities = new Map<string, Map<SceneId, number>>();

  recordIntensity(theme: string, sceneId: SceneId, intensity: number): void {
    const sceneIntensities = this.#sceneIntensities.get(theme) ?? new Map<SceneId, number>();
    sceneIntensities.set(sceneId, intensity);
    this.#sceneIntensities.set(theme, sceneIntensities);
    this.themes.set(theme, {
      intensity: average(sceneIntensities.values()),
      sceneIntensities,
    });
  }

  getIntensity(theme: string): number {
    return this.themes.get(theme)?.intensity ?? 0;
  }

  getSceneIntensity(theme: string, sceneId: SceneId): number | undefined {
    return this.#sceneIntensities.get(theme)?.get(sceneId);
  }

  getAllThemes(): string[] {
    return [...this.themes.keys()];
  }

  getThemeProgression(theme: string): { sceneId: SceneId; intensity: number }[] {
    return [...(this.#sceneIntensities.get(theme) ?? new Map<SceneId, number>())].map(([sceneId, intensity]) => ({
      sceneId,
      intensity,
    }));
  }

  getStrongestThemes(): { theme: string; intensity: number }[] {
    return [...this.themes]
      .map(([theme, { intensity }]) => ({ theme, intensity }))
      .sort((left, right) => right.intensity - left.intensity)
      .slice(0, 10);
  }

  toInterface(): ThematicProgression {
    return {
      themes: new Map(
        [...this.themes].map(([theme, value]) => [
          theme,
          { intensity: value.intensity, sceneIntensities: new Map(value.sceneIntensities) },
        ]),
      ),
      getIntensity: this.getIntensity.bind(this),
      recordIntensity: this.recordIntensity.bind(this),
    };
  }
}

function average(values: Iterable<number>): number {
  let total = 0;
  let count = 0;

  for (const value of values) {
    total += value;
    count++;
  }

  return count === 0 ? 0 : total / count;
}
