import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { templateRegistry } from "@kleptowriter/kleptowriter-core/narrative/templates/index.js";

function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

export const listNarrativeTemplatesTool = defineTool({
  name: "list_narrative_templates",
  label: "List Narrative Templates",
  description: "Lists all available narrative structure templates (Hero's Journey, Three-Act Structure, Kishotenketsu, etc.) with descriptions and beat counts. Use this to help the novelist choose a story structure.",
  parameters: Type.Object({}),
  execute: async () => {
    const names = templateRegistry.listStructures();
    const templates = names.map((name: string) => {
      const struct = templateRegistry.getStructure(name);
      return {
        name,
        description: struct?.description ?? "",
        beatCount: struct?.beats.length ?? 0,
      };
    });
    return {
      content: textContent(JSON.stringify(templates, null, 2)),
      details: { templates, count: templates.length },
    };
  },
});
