import type {
  ArcTracker,
  CharacterState,
  DramaticQuestion,
  ItemState,
  LocationState,
  PlotThread,
} from "../data-model/bible/interfaces.js";
import type { StoryBibleUpdate } from "../data-model/bible/cache.js";
import { InMemoryStoryBible } from "../data-model/bible/cache.js";
import type { Mailbox, MailboxMessage } from "../mailbox/index.js";

type EntityChanges<T extends object> = Map<string, Partial<T>>;

export interface BibleUpdate {
  timestamp: number;
  agentId: string;
  changes: {
    characters?: EntityChanges<CharacterState>;
    plotThreads?: EntityChanges<PlotThread>;
    locations?: EntityChanges<LocationState>;
    items?: EntityChanges<ItemState>;
    arcs?: EntityChanges<ArcTracker>;
    dramaticQuestions?: EntityChanges<DramaticQuestion>;
  };
}

export interface UpdateResult {
  applied: boolean;
  previousVersion: number;
  newVersion: number;
  changedEntities: string[];
  conflicts: string[];
}

type EntityKind = keyof BibleUpdate["changes"];

interface FieldWrite {
  timestamp: number;
  agentId: string;
}

export class BibleUpdateProtocol {
  private readonly fieldWrites = new Map<string, FieldWrite>();

  constructor(
    private readonly bible: InMemoryStoryBible,
    private readonly conflictStrategy: "last-writer-wins" | "merge" = "last-writer-wins",
    private readonly mailbox?: Mailbox,
  ) {}

  applyUpdate(update: BibleUpdate): UpdateResult {
    const previousVersion = this.bible.version;
    const conflicts = this.detectConflicts(update);
    const changes = this.filterChangedFields(update);
    const changedEntities = collectChangedEntities(changes);

    if (changedEntities.length === 0) {
      return { applied: false, previousVersion, newVersion: previousVersion, changedEntities, conflicts };
    }

    const newVersion = this.bible.applyStateUpdate(changes);
    this.recordWrites(update, changes);
    this.broadcastUpdate(previousVersion, newVersion, changedEntities, conflicts);

    return { applied: true, previousVersion, newVersion, changedEntities, conflicts };
  }

  applyMessages(messages: MailboxMessage[]): UpdateResult[] {
    return messages.flatMap((message) => {
      if (message.type !== "state_update" || !isBibleUpdate(message.payload)) return [];
      return [this.applyUpdate(message.payload)];
    });
  }

  private mergeCharacter(existing: CharacterState, update: Partial<CharacterState>): CharacterState {
    return { ...existing, ...update };
  }

  private detectConflicts(update: BibleUpdate): string[] {
    const conflicts: string[] = [];

    forEachField(update.changes, (kind, id, field) => {
      const write = this.fieldWrites.get(fieldKey(kind, id, field));
      if (write && write.agentId !== update.agentId && write.timestamp > update.timestamp) {
        conflicts.push(`${kind}.${id}.${field}`);
      }
    });

    return conflicts;
  }

  private filterChangedFields(update: BibleUpdate): StoryBibleUpdate {
    const changes: StoryBibleUpdate = {};

    this.copyChangedMap<CharacterState>("characters", update, changes, (existing, patch) =>
      this.mergeCharacter(existing, patch),
    );
    this.copyChangedMap("locations", update, changes);
    this.copyChangedMap("items", update, changes);
    this.copyChangedMap("arcs", update, changes);
    this.copyChangedMap("plotThreads", update, changes);
    this.copyChangedMap("dramaticQuestions", update, changes);

    return changes;
  }

  private copyChangedMap<T extends object>(
    kind: EntityKind,
    update: BibleUpdate,
    changes: StoryBibleUpdate,
    merge: (existing: T, patch: Partial<T>) => T = (existing, patch) => ({ ...existing, ...patch }),
  ): void {
    const source = update.changes[kind] as EntityChanges<T> | undefined;
    if (!source) return;

    const target = this.bible[kind] as Map<string, T>;
    const changed = new Map<string, Partial<T>>();

    for (const [id, patch] of source) {
      const existing = target.get(id);
      const nextPatch = this.filterPatch(kind, id, update, existing, patch);
      if (Object.keys(nextPatch).length === 0) continue;

      const next = existing ? merge(existing, nextPatch) : nextPatch;
      if (!existing || !sameValue(existing, next)) changed.set(id, nextPatch);
    }

    if (changed.size > 0) {
      (changes as Record<EntityKind, EntityChanges<T> | undefined>)[kind] = changed;
    }
  }

  private filterPatch<T extends object>(
    kind: EntityKind,
    id: string,
    update: BibleUpdate,
    existing: T | undefined,
    patch: Partial<T>,
  ): Partial<T> {
    const next: Partial<T> = {};

    for (const [field, value] of Object.entries(patch) as [keyof T & string, Partial<T>[keyof T & string]][]) {
      const write = this.fieldWrites.get(fieldKey(kind, id, field));
      if (this.conflictStrategy === "last-writer-wins" && write && write.timestamp > update.timestamp) {
        continue;
      }
      if (existing && sameValue(existing[field], value)) continue;
      (next as Record<keyof T & string, Partial<T>[keyof T & string]>)[field] = value;
    }

    return next;
  }

  private recordWrites(update: BibleUpdate, changes: StoryBibleUpdate): void {
    forEachField(changes, (kind, id, field) => {
      this.fieldWrites.set(fieldKey(kind, id, field), {
        timestamp: update.timestamp,
        agentId: update.agentId,
      });
    });
  }

  private broadcastUpdate(
    previousVersion: number,
    newVersion: number,
    changedEntities: string[],
    conflicts: string[],
  ): void {
    this.mailbox?.broadcast("bible", "broadcast", {
      event: "bible_updated",
      previousVersion,
      newVersion,
      changedEntities,
      conflicts,
    });
  }
}

function collectChangedEntities(changes: StoryBibleUpdate): string[] {
  const changed: string[] = [];
  forEachEntity(changes, (kind, id) => changed.push(`${kind}.${id}`));
  return changed;
}

function forEachField(
  changes: BibleUpdate["changes"] | StoryBibleUpdate,
  visit: (kind: EntityKind, id: string, field: string) => void,
): void {
  forEachEntity(changes, (kind, id, patch) => {
    for (const field of Object.keys(patch)) visit(kind, id, field);
  });
}

function forEachEntity(
  changes: BibleUpdate["changes"] | StoryBibleUpdate,
  visit: (kind: EntityKind, id: string, patch: Partial<object>) => void,
): void {
  for (const kind of ["characters", "locations", "items", "arcs", "plotThreads", "dramaticQuestions"] as const) {
    const map = changes[kind] as EntityChanges<object> | undefined;
    if (!map) continue;
    for (const [id, patch] of map) visit(kind, id, patch);
  }
}

function fieldKey(kind: EntityKind, id: string, field: string): string {
  return `${kind}:${id}:${field}`;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left instanceof Map && right instanceof Map) {
    return left.size === right.size && [...left].every(([key, value]) => sameValue(value, right.get(key)));
  }
  if (left instanceof Set && right instanceof Set) {
    return left.size === right.size && [...left].every((value) => right.has(value));
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => sameValue(left[key], right[key]));
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && value.constructor === Object;
}

function isBibleUpdate(value: unknown): value is BibleUpdate {
  return isPlainObject(value) && typeof value.timestamp === "number" && typeof value.agentId === "string";
}
