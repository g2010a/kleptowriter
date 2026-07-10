import { circular } from "./circular.js";
import { epistolary } from "./epistolary.js";
import { fichteanCurve } from "./fichtean-curve.js";
import { frameNarrative } from "./frame-narrative.js";
import { freytagsPyramid } from "./freytags-pyramid.js";
import { heroinesJourney } from "./heroines-journey.js";
import { herosJourney } from "./heros-journey.js";
import { inMediasRes } from "./in-medias-res.js";
import { kishotenketsu } from "./kishotenketsu.js";
import { nonlinear } from "./nonlinear.js";
import { parallelNarrative } from "./parallel-narrative.js";
import { saveTheCat } from "./save-the-cat.js";
import { threeActStructure } from "./three-act-structure.js";
import type { NarrativeStructure, TemplateRegistry } from "./types.js";

export type { NarrativeBeat, NarrativeBeatType, NarrativeStructure, TemplateConstraint, TemplateRegistry } from "./types.js";

export const builtInTemplates: Record<string, NarrativeStructure> = {
  [herosJourney.name]: herosJourney,
  [heroinesJourney.name]: heroinesJourney,
  [freytagsPyramid.name]: freytagsPyramid,
  [threeActStructure.name]: threeActStructure,
  [kishotenketsu.name]: kishotenketsu,
  [saveTheCat.name]: saveTheCat,
  [fichteanCurve.name]: fichteanCurve,
  [inMediasRes.name]: inMediasRes,
  [frameNarrative.name]: frameNarrative,
  [nonlinear.name]: nonlinear,
  [epistolary.name]: epistolary,
  [parallelNarrative.name]: parallelNarrative,
  [circular.name]: circular,
};

export const templateRegistry: TemplateRegistry = {
  getStructure(name) {
    return builtInTemplates[name];
  },
  listStructures() {
    return Object.keys(builtInTemplates);
  },
};

export function createTemplateRegistry(): TemplateRegistry {
  return templateRegistry;
}

export {
  circular,
  epistolary,
  fichteanCurve,
  frameNarrative,
  freytagsPyramid,
  heroinesJourney,
  herosJourney,
  inMediasRes,
  kishotenketsu,
  nonlinear,
  parallelNarrative,
  saveTheCat,
  threeActStructure,
};
