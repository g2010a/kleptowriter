import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = join(__dirname);

export async function loadFixture(name: string): Promise<string> {
  return readFile(join(FIXTURES_DIR, `${name}.json`), "utf-8");
}

export async function loadFixtureJson<T>(name: string): Promise<T> {
  const content = await loadFixture(name);
  return JSON.parse(content) as T;
}
