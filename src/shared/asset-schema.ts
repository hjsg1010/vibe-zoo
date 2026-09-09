import { z } from "zod";
import { inputsSchema, planSchema } from "./operation-schema.js";
export const inputContractSchema = z
  .array(
    z.strictObject({
      name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/),
      description: z.string().max(300),
      type: z.enum(["string", "number", "boolean"]),
      required: z.boolean(),
    }),
  )
  .max(20);
export const toolSchema = z.strictObject({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  description: z.string().min(1).max(600),
  inputContract: inputContractSchema,
  adapter: planSchema,
});
export const skillSchema = z.strictObject({
  name: z.string().min(1).max(100),
  description: z.string().max(600),
  inputContract: inputContractSchema,
  steps: z
    .array(
      z.strictObject({
        toolVersionId: z.string().min(1).max(128),
        arguments: inputsSchema,
        bindings: z.record(z.string(), z.string().max(64)),
      }),
    )
    .min(1)
    .max(15),
});
export const generatedBundleSchema = z.strictObject({
  tool: toolSchema,
  basicSkill: z.strictObject({
    name: z.string().min(1).max(100),
    description: z.string().max(600),
  }),
  evidenceSummary: z.string().min(1).max(1000),
  exampleInputs: inputsSchema,
  validationInputs: inputsSchema,
  skillValidationInputs: inputsSchema,
});
export const discoveredToolSchema = z.strictObject({
  tool: toolSchema,
  evidenceSummary: z.string().min(1).max(1000),
  exampleInputs: inputsSchema,
  validationInputs: inputsSchema,
});
export const discoverySchema = z.strictObject({
  tools: z.array(discoveredToolSchema).max(3),
  remaining: z.array(z.string().max(200)).max(20),
  unsupported: z.array(z.string().max(300)).max(12),
  inspect: z.union([
    z.strictObject({ path: z.string().max(500) }),
    z.strictObject({
      label: z.string().max(200),
      role: z.enum(["button", "link"]),
    }),
    z.null(),
  ]),
});
export type Tool = z.infer<typeof toolSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Version = {
  id: string;
  assetId: string;
  owner: string;
  kind: "tool" | "basic_skill" | "personal_skill";
  siteKey: string;
  content: Tool | Skill;
  evidence: string;
  discovery?: {
    sourceJobId: string;
    exampleInputs: z.infer<typeof inputsSchema>;
    validationInputs: z.infer<typeof inputsSchema>;
  };
  previousId?: string;
  createdAt: number;
};
export type ToolBundle = {
  contract: Tool["inputContract"];
  adapter: Tool["adapter"]["operations"];
  validator: Tool["adapter"]["postconditions"];
  basicSkill: Version;
  evidence: string;
  version: Version;
};
export type PersonalAsset = {
  id: string;
  owner: string;
  currentVersionId: string | null;
  previousVersionId: string | null;
  name: string;
  description: string;
  defaults: z.infer<typeof inputsSchema>;
  enabled: boolean;
  revision: number;
  siteKey: string;
};
export type ValidationReport = {
  outcome?: import("./contracts.js").Outcome;
  id: string;
  owner: string;
  jobId: string;
  versionId: string;
  caseKind:
    | "state_observation"
    | "different_input"
    | "failure_reproduction"
    | "success_regression"
    | "execution";
  inputs: z.infer<typeof inputsSchema>;
  status: "passed" | "failed" | "unknown";
  actionIds: string[];
  createdAt: number;
};
