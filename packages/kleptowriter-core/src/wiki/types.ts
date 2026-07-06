export enum WikiPageType {
  Character = "character",
  Location = "location",
  Concept = "concept",
  Plot = "plot",
  Research = "research",
  Scene = "scene",
}

export interface WikiPage {
  type: WikiPageType;
  name: string;
  aliases: string[];
  tags: string[];
  relatedPages: string[];
  frontmatter: Record<string, unknown>;
  body: string;
}

export type WikiLink = {
  text: string;
  target: string;
  isResolved: boolean;
};

export type WikiIndexEntry = {
  type: WikiPageType;
  name: string;
  path: string;
  tags: string[];
  summary: string;
};
