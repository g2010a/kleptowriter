import { expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { readScene, writeScene } from "./data-model/scene/index.js";
import type { SceneDocument } from "./data-model/scene/index.js";
import { SceneStatus } from "./types/index.js";
import { parseWikiPageContent, WikiLinkExtractor, WikiPageType } from "./wiki/index.js";

test("core barrel loads", () => {
  expect(true).toBe(true);
});

test("scene files roundtrip", async () => {
  const directory = join(import.meta.dir, "../tmp");
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "scene-roundtrip.md");
  const scene: SceneDocument = {
    id: "scene-001",
    title: "The Beginning",
    status: SceneStatus.Outline,
    metadata: {
      pov: "char-001",
      characters: ["char-001", "char-002"],
      locations: ["loc-001"],
      tension: 5,
      mood: "mysterious",
      plotThreads: ["thread-001"],
      thematicMotifs: [],
      dramaticQuestions: [],
    },
    prose: "This is the body of the scene in markdown.",
    customFields: { draftLabel: "alpha" },
  };

  await writeScene(path, scene);
  const result = await readScene(path);

  expect(result).toEqual({ ok: true, data: scene });
});

test("parses wiki page frontmatter and body", () => {
  const result = parseWikiPageContent(`---
type: character
name: John Doe
aliases:
  - John
  - The Stranger
tags:
  - protagonist
relatedPages:
  - jane-doe
---
John Doe is the main protagonist.
`);

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(result.data).toMatchObject({
    type: WikiPageType.Character,
    name: "John Doe",
    aliases: ["John", "The Stranger"],
    tags: ["protagonist"],
    relatedPages: ["jane-doe"],
    body: "John Doe is the main protagonist.\n",
  });
});

test("extracts and replaces wiki links", () => {
  const body = "Meet [[john-doe|John]] in [[new-york]] and [[new-york]].";
  const links = WikiLinkExtractor.extractLinks(body);

  expect(links).toEqual([
    { text: "John", target: "john-doe", isResolved: false },
    { text: "new-york", target: "new-york", isResolved: false },
    { text: "new-york", target: "new-york", isResolved: false },
  ]);
  expect(WikiLinkExtractor.resolveLink("[[John-Doe|John]]", new Map([["john-doe", "john.md"]]))).toEqual({
    text: "John",
    target: "John-Doe",
    isResolved: true,
  });
  expect(WikiLinkExtractor.replaceLinks(body, (target) => `wiki/${target}.md`)).toBe(
    "Meet [John](<wiki/john-doe.md>) in [new-york](<wiki/new-york.md>) and [new-york](<wiki/new-york.md>).",
  );
});

test("parses inline arrays and empty wiki scalars", () => {
  const result = parseWikiPageContent(`---
type: research
name:
aliases: [Archive, Notes]
tags: [history, source]
---
Notes.
`, "research.md");

  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(result.data.name).toBe("research");
  expect(result.data.aliases).toEqual(["Archive", "Notes"]);
  expect(result.data.tags).toEqual(["history", "source"]);
  expect(result.data.frontmatter.name).toBe("");
});

test("escapes generated markdown links", () => {
  const body = "See [[unsafe|A [ label]] and [[missing]].";

  expect(
    WikiLinkExtractor.replaceLinks(body, (target) => (target === "unsafe" ? "wiki/path with > chars.md" : null)),
  ).toBe("See [A \\[ label](<wiki/path%20with%20%3E%20chars.md>) and [[missing]].");
});
