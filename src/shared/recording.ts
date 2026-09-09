import { z } from "zod";
import { observationSchema } from "./contracts.js";
export const recordingSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  startedAt: z.number().int(),
  stoppedAt: z.number().int(),
  complete: z.boolean(),
  limitations: z.array(z.string().max(100)).max(12),
  initial: observationSchema,
  final: observationSchema,
  events: z
    .array(
      z.strictObject({
        kind: z.enum(["click", "change", "navigation"]),
        path: z.string().max(500),
        role: z.string().max(40),
        label: z.string().max(200),
        value: z.union([z.string().max(200), z.boolean()]).optional(),
      }),
    )
    .max(100),
});
export type Recording = z.infer<typeof recordingSchema>;
export const RECORD_TTL = 30 * 60 * 1000;
