import type { ChapterId, SceneId } from "../../types/index.js";

export interface ChapterAssembly {
  id: ChapterId;
  title: string;
  description: string;
  sortOrder: number;
  scenes: SceneId[];
  type: "narrative" | "interlude" | "prologue" | "epilogue";
}

export interface ChapterCandidate {
  id: string;
  title: string;
  sceneIds: SceneId[];
  confidence: number;
  breakReason: string;
}

export interface ChapterEdit {
  chapterId: ChapterId;
  action: "merge" | "split" | "reorder" | "rename";
  params?: Record<string, unknown>;
}
