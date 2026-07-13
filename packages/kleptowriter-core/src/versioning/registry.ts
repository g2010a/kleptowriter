/**
 * Version Registry for schema migrations.
 *
 * Provides a synchronous registry for managing schema version migrations.
 * Migrations are registered with from/to version numbers and a migration function.
 */

export type MigrationFunction = (data: unknown) => unknown;

export interface Migration {
  from: number;
  to: number;
  migrate: MigrationFunction;
  description: string;
}

export class VersionRegistry {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
  }

  getUpgradePath(from: number, to: number): Migration[] {
    return this.migrations
      .filter((m) => m.from >= from && m.to <= to)
      .sort((a, b) => a.from - b.from);
  }

  getMaxSchemaVersion(): number {
    if (this.migrations.length === 0) {
      return 0;
    }
    return Math.max(...this.migrations.map((m) => m.to));
  }

  canHandle(schemaVersion: number): boolean {
    return schemaVersion <= this.getMaxSchemaVersion();
  }
}