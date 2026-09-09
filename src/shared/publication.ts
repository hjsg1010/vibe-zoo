import type { Skill, Tool } from "./asset-schema.js";
export type Publication = {
  id: string;
  name: string;
  description: string;
  author: string;
  scope: string;
  siteKey?: string;
  createdAt: number;
  mainRef: string;
  versions: {
    ref: string;
    kind: "tool" | "basic_skill" | "personal_skill";
    content: Tool | Skill;
  }[];
  validation: string;
  limitations: string;
};
export type Installation = {
  id: string;
  publicationId: string;
  assetId: string;
  versionId: string;
  versions: Record<string, string>;
  sourceInputs: Record<string, never>;
};
