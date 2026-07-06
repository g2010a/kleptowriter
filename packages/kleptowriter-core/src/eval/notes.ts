export interface AgentNote {
  id: string;
  agentId: string;
  sceneId: string;
  note: string;
  severity: "info" | "warning" | "blocking";
  category: "continuity" | "character" | "plot" | "style" | "prose" | "structure" | "research";
  timestamp: number;
}

export interface NoteAggregation {
  bySeverity: Record<string, AgentNote[]>;
  byCategory: Record<string, AgentNote[]>;
  byAgent: Record<string, AgentNote[]>;
  total: number;
}

export class NoteCollector {
  private notes: Map<string, AgentNote[]> = new Map();

  addNote(note: AgentNote): void {
    const sceneNotes = this.notes.get(note.sceneId) ?? [];
    sceneNotes.push(note);
    this.notes.set(note.sceneId, sceneNotes);
  }

  collectNotes(sceneId: string): AgentNote[] {
    return [...(this.notes.get(sceneId) ?? [])];
  }

  aggregate(): NoteAggregation {
    const all = this.getAll();

    return {
      bySeverity: this.groupBy(all, (note) => note.severity),
      byCategory: this.groupBy(all, (note) => note.category),
      byAgent: this.groupBy(all, (note) => note.agentId),
      total: all.length,
    };
  }

  getAll(): AgentNote[] {
    return [...this.notes.values()].flat();
  }

  clear(): void {
    this.notes.clear();
  }

  private groupBy(notes: AgentNote[], key: (note: AgentNote) => string): Record<string, AgentNote[]> {
    return notes.reduce<Record<string, AgentNote[]>>((groups, note) => {
      const groupKey = key(note);
      const group = groups[groupKey] ?? [];
      group.push(note);
      groups[groupKey] = group;
      return groups;
    }, {});
  }
}
