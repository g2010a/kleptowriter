import type { CharacterId, SceneId } from "../../types/index.js";
import type { PlotThread } from "./interfaces.js";

type PlotThreadStatus = PlotThread["status"];

export class PlotThreadTransitionError extends Error {
  constructor(id: string, from: PlotThreadStatus, to: PlotThreadStatus) {
    super(`Cannot transition plot thread ${id} from ${from} to ${to}`);
    this.name = "PlotThreadTransitionError";
  }
}

export class PlotThreadTracker {
  readonly #threads = new Map<string, PlotThread>();

  introduce(id: string, name: string, description: string): PlotThread {
    const thread: PlotThread = {
      id,
      name,
      description,
      status: "introduced",
      relatedSceneIds: [],
    };

    this.#threads.set(id, thread);
    return thread;
  }

  advance(id: string, sceneId: SceneId): PlotThread {
    const thread = this.requireThread(id);
    if (thread.status !== "introduced" && thread.status !== "developed") {
      throw new PlotThreadTransitionError(id, thread.status, "developed");
    }

    return this.update(id, { ...thread, status: "developed", relatedSceneIds: appendScene(thread, sceneId) });
  }

  resolve(id: string, sceneId: SceneId): PlotThread {
    const thread = this.requireThread(id);
    if (thread.status !== "developed") throw new PlotThreadTransitionError(id, thread.status, "resolved");

    return this.update(id, { ...thread, status: "resolved", relatedSceneIds: appendScene(thread, sceneId) });
  }

  drop(id: string): PlotThread {
    const thread = this.requireThread(id);
    if (thread.status !== "introduced") throw new PlotThreadTransitionError(id, thread.status, "dropped");

    return this.update(id, { ...thread, status: "dropped" });
  }

  getThread(id: string): PlotThread | undefined {
    return this.#threads.get(id);
  }

  getActiveThreads(): PlotThread[] {
    return [...this.#threads.values()].filter((thread) => thread.status === "introduced" || thread.status === "developed");
  }

  getResolvedThreads(): PlotThread[] {
    return [...this.#threads.values()].filter((thread) => thread.status === "resolved");
  }

  getThreadsByScene(sceneId: SceneId): PlotThread[] {
    return [...this.#threads.values()].filter((thread) => thread.relatedSceneIds.includes(sceneId));
  }

  getThreadsByCharacter(characterId: CharacterId): PlotThread[] {
    const needle = characterId.toLocaleLowerCase();
    return [...this.#threads.values()].filter((thread) => thread.description.toLocaleLowerCase().includes(needle));
  }

  toMap(): Map<string, PlotThread> {
    return new Map(this.#threads);
  }

  private requireThread(id: string): PlotThread {
    const thread = this.#threads.get(id);
    if (!thread) throw new Error(`Plot thread ${id} does not exist`);
    return thread;
  }

  private update(id: string, thread: PlotThread): PlotThread {
    this.#threads.set(id, thread);
    return thread;
  }
}

function appendScene(thread: PlotThread, sceneId: SceneId): SceneId[] {
  return thread.relatedSceneIds.includes(sceneId) ? thread.relatedSceneIds : [...thread.relatedSceneIds, sceneId];
}
