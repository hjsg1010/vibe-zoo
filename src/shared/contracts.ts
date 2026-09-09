import { z } from "zod";
import {
  inputsSchema,
  operationSchema,
  postconditionSchema,
} from "./operation-schema.js";
export const idSchema = z.string().min(1).max(128);
export const bindingSchema = z.strictObject({
  instance: idSchema,
  connection: idSchema,
  tabId: z.number().int().nonnegative(),
  documentId: idSchema,
  origin: z.string().url().max(500),
  path: z.string().max(500),
  revision: z.number().int().nonnegative(),
});
export type Binding = z.infer<typeof bindingSchema>;
export const observationSchema = z.strictObject({
  title: z.string().max(200),
  path: z.string().max(500),
  elements: z
    .array(
      z.strictObject({
        role: z.string().max(40),
        label: z.string().max(200),
        text: z.string().max(300),
        placeholder: z.string().max(100).optional(),
        testid: z.string().max(100).optional(),
        value: z.string().max(200).optional(),
        disabled: z.boolean().optional(),
        href: z.string().max(500).optional(),
        id: z.string().max(100).optional(),
        name: z.string().max(100).optional(),
        options: z
          .array(
            z.strictObject({
              text: z.string().max(100),
              value: z.string().max(100),
            }),
          )
          .max(40)
          .optional(),
      }),
    )
    .max(180),
  limitations: z
    .array(
      z.enum([
        "cross_origin_frame",
        "frame",
        "canvas",
        "sensitive_fields",
        "truncated",
        "unsupported_page",
      ]),
    )
    .max(6),
});
export type Observation = z.infer<typeof observationSchema>;
export const outcomeSchema = z.strictObject({
  status: z.enum(["success", "failure", "interrupted", "partial", "unknown"]),
  completed: z.array(z.number().int().nonnegative()).max(60),
  reason: z.string().max(1000),
  observation: observationSchema.optional(),
});
export type Outcome = z.infer<typeof outcomeSchema>;
export type Budget = {
  activeMs: number;
  browserOps: number;
  reconcileOps: number;
  modelRequests: number;
  tokens: number;
  reservedTokens: number;
};
export type JobStatus =
  | "queued"
  | "running"
  | "waiting_input"
  | "waiting_confirmation"
  | "waiting_connection"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";
export type JobKind =
  "generation" | "execution" | "learning" | "improvement" | "install";
export type Snapshot = {
  assetId: string;
  versionId: string;
  settingsRevision: number;
  name?: string;
  description?: string;
  defaults: z.infer<typeof inputsSchema>;
};
export type Job = {
  id: string;
  owner: string;
  kind: JobKind;
  requestKey: string;
  fingerprint: string;
  conversationId: string;
  binding: Binding;
  status: JobStatus;
  cancelled: boolean;
  controlRevision: number;
  inputRevision: number;
  inputs: z.infer<typeof inputsSchema>;
  purpose: string;
  snapshots: Snapshot[];
  budget: Budget;
  candidateId?: string;
  discovery?: {
    phase: "observing" | "analyzing" | "inspecting" | "ready";
    versionIds: string[];
    reused: number;
    pages: number;
    round: number;
    remaining: string[];
    unsupported: string[];
  };
  improvement?: {
    assetId: string;
    baseVersionId: string;
    failureReportId: string;
    successReportId: string;
    phase: "proposing" | "draft" | "queued" | "validating" | "review";
    reason?: string;
    failureInputs?: z.infer<typeof inputsSchema>;
    successInputs?: z.infer<typeof inputsSchema>;
    acceptedDigest?: string;
    appliedDigest?: string;
  };
  installation?: {
    publicationId: string;
    dependencyInputs: Record<string, z.infer<typeof inputsSchema>>;
  };
  learning?: {
    recordRevision: number;
    sourceInputs: z.infer<typeof inputsSchema>;
    validationStarted: boolean;
    accepted?: { revision: number; inputRevision: number; digest: string };
  };
  assetExecution?: { versionId: string };
  assetValidation?: {
    versionId: string;
    inputs: z.infer<typeof inputsSchema>;
    sourceInputs: z.infer<typeof inputsSchema>;
    sourceJobId: string;
  };
  validatorRepair?: "requested" | "finished";
  nonExecutionReview?: {
    actionId: string;
    evidenceActionId: string;
    reason: string;
    at: number;
  };
  validationRequest?: {
    sourceJobId: string;
    toolInputs: z.infer<typeof inputsSchema>;
    skillInputs: z.infer<typeof inputsSchema>;
    sourceInputs: z.infer<typeof inputsSchema>;
  };
  outcome?: Outcome;
  createdAt: number;
  updatedAt: number;
};
export const commandSchema = z.strictObject({
  type: z.literal("action"),
  actionId: idSchema,
  jobId: idSchema,
  controlRevision: z.number().int().nonnegative(),
  binding: bindingSchema,
  expiresAt: z.number().int(),
  operation: operationSchema,
  inputs: inputsSchema,
  postconditions: z.array(postconditionSchema).max(10),
});
export type BrowserCommand = z.infer<typeof commandSchema>;
export const receiptSchema = z.strictObject({
  type: z.literal("receipt"),
  actionId: idSchema,
  jobId: idSchema,
  controlRevision: z.number().int(),
  binding: bindingSchema,
  nextBinding: bindingSchema.optional(),
  outcome: outcomeSchema,
});
export type Receipt = z.infer<typeof receiptSchema>;
export type Confirmation = {
  actionId: string;
  jobId: string;
  controlRevision: number;
  inputRevision: number;
  binding: Binding;
  operation: z.infer<typeof operationSchema>;
  inputs: z.infer<typeof inputsSchema>;
  versionIds: string[];
};
export type Action = {
  id: string;
  jobId: string;
  owner: string;
  step: number;
  state: "intent" | "sent" | "observed" | "unknown";
  command: BrowserCommand;
  receipt?: Receipt;
  reconciliation?: { actionId: string; outcome: Outcome };
};
export const requestSchema = z.strictObject({
  requestKey: idSchema,
  conversationId: idSchema,
  binding: bindingSchema,
  purpose: z.string().min(1).max(2000),
  inputs: inputsSchema.default({}),
});
export const controlSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  action: z.enum([
    "cancel",
    "confirm",
    "supplement",
    "reconcile",
    "review_not_executed",
  ]),
  reviewReason: z.string().min(10).max(500).optional(),
  actionId: idSchema.optional(),
  inputs: inputsSchema.optional(),
});

// CSS modules are emitted by esbuild, never loaded by the backend.
