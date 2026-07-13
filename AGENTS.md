<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->

---

## Coding Agent Version Tools

Kleptowriter Core exports version utilities for coding agents to check project compatibility at session start.

### Import

```typescript
import { getManifestVersionInfo, getStoryMetadataVersionInfo, getAllVersionInfo } from "@kleptowriter/kleptowriter-core";
```

### Usage at Session Start

```typescript
import { getAllVersionInfo } from "@kleptowriter/kleptowriter-core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function checkProjectVersion(projectDir: string) {
  const current = getAllVersionInfo();
  
  // Check .kleptowriter.json
  let manifestVersion = 0;
  try {
    const manifest = JSON.parse(await readFile(join(projectDir, ".kleptowriter.json"), "utf-8"));
    manifestVersion = manifest.manifest_version ?? 0;
  } catch {
    // File doesn't exist or is invalid
  }
  
  // Check story/story-metadata.json
  let storySchemaVersion = 0;
  try {
    const metadata = JSON.parse(await readFile(join(projectDir, "story", "story-metadata.json"), "utf-8"));
    storySchemaVersion = metadata.schemaVersion ?? 0;
  } catch {
    // File doesn't exist or is invalid
  }
  
  const needsManifestUpgrade = manifestVersion < current.manifest.manifest_version;
  const needsStoryUpgrade = storySchemaVersion < current.storyMetadata.schemaVersion;
  
  if (needsManifestUpgrade || needsStoryUpgrade) {
    console.log(`[kleptowriter] Project upgrade needed:`);
    if (needsManifestUpgrade) {
      console.log(`  - Manifest: v${manifestVersion} → v${current.manifest.manifest_version}`);
    }
    if (needsStoryUpgrade) {
      console.log(`  - Story schema: v${storySchemaVersion} → v${current.storyMetadata.schemaVersion}`);
    }
    console.log(`  Run 'kleptowriter version:upgrade' to migrate.`);
  }
  
  return { needsManifestUpgrade, needsStoryUpgrade };
}

// Call at session start
await checkProjectVersion(process.cwd());
```

### Version Info Types

```typescript
// Project manifest (.kleptowriter.json)
interface ManifestVersionInfo {
  manifest_version: number;
  kleptowriter_version: string;
}

// Story metadata (story/story-metadata.json)
interface StoryMetadataVersionInfo {
  schemaVersion: number;
  kleptowriterVersion: string;
}

// Combined
interface AllVersionInfo {
  manifest: ManifestVersionInfo;
  storyMetadata: StoryMetadataVersionInfo;
}
```

### Current Versions (0.3.0)

- `manifest_version`: 1
- `schemaVersion` (story): 1
- `kleptowriter_version`: "0.3.0"

### Notes

- These are **check-only** utilities — they do NOT run migrations
- Migrations are handled separately via `kleptowriter version:upgrade` CLI
- Core package has no dependencies on Pi SDK or TUI — only `node:fs/promises` and internal version constants
