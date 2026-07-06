import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface RawInputFile {
  path: string;
  name: string;
  type: "notes" | "outline" | "research" | "character_sketch" | "setting" | "reference" | "unknown";
  extension: string;
  sizeBytes: number;
}

export class RawInputScanner {
  async scan(rootPath: string): Promise<RawInputFile[]> {
    const scanRoot = resolveRawInputsRoot(rootPath);
    const files: RawInputFile[] = [];

    for (const path of collectFiles(scanRoot)) {
      const metadata = readFileMetadata(path, scanRoot);
      if (metadata === null) {
        continue;
      }

      files.push(metadata);
    }

    return files;
  }
}

function resolveRawInputsRoot(rootPath: string): string {
  const direct = join(rootPath, "raw-inputs");
  try {
    if (statSync(direct).isDirectory()) {
      return direct;
    }
  } catch {
  }

  return rootPath;
}

function collectFiles(path: string): string[] {
  const files: string[] = [];

  try {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const entryPath = join(path, entry.name);

      if (entry.isDirectory()) {
        files.push(...collectFiles(entryPath));
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  } catch (error) {
    console.error(`Failed to read raw inputs directory ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return files;
}

function readFileMetadata(path: string, scanRoot: string): RawInputFile | null {
  try {
    const stat = statSync(path);
    const name = path.split(/[\\/]/).pop() ?? path;
    const extension = getExtension(name);

    return {
      path: relative(scanRoot, path),
      name,
      type: classifyRawInput(name, extension),
      extension,
      sizeBytes: stat.size,
    };
  } catch (error) {
    console.error(`Failed to read raw input file ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function classifyRawInput(name: string, extension: string): RawInputFile["type"] {
  if (extension !== ".md") {
    return "unknown";
  }

  const normalized = name.toLowerCase();

  if (normalized.includes("notes")) {
    return "notes";
  }

  if (normalized.includes("outline")) {
    return "outline";
  }

  if (normalized.includes("research")) {
    return "research";
  }

  if (normalized.includes("char-") || normalized.includes("character")) {
    return "character_sketch";
  }

  if (normalized.includes("setting") || normalized.includes("location")) {
    return "setting";
  }

  return "reference";
}
