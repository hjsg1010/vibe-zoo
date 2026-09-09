import { z } from "zod";
export const text = z.string().max(1000);
export const inputsSchema = z.record(
  z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/),
  z.union([text, z.number().finite(), z.boolean()]),
);
export type Inputs = z.infer<typeof inputsSchema>;
export const valueSchema = z.union([
  z.strictObject({ literal: text }),
  z.strictObject({ input: z.string().min(1).max(64) }),
]);
export const locatorSchema = z.strictObject({
  by: z.enum(["label", "text", "placeholder", "testid", "role", "id", "name"]),
  value: valueSchema,
  role: z
    .enum([
      "tab",
      "button",
      "link",
      "textbox",
      "checkbox",
      "combobox",
      "option",
      "row",
      "cell",
      "heading",
    ])
    .optional(),
});
export const operationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("observe") }),
  z.strictObject({
    kind: z.literal("click"),
    locator: locatorSchema,
    changesData: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal("input"),
    locator: locatorSchema,
    value: valueSchema,
  }),
  z.strictObject({
    kind: z.literal("select"),
    locator: locatorSchema,
    value: valueSchema,
  }),
  z.strictObject({
    kind: z.literal("wait"),
    locator: locatorSchema,
    timeoutMs: z.number().int().min(100).max(10000),
  }),
  z.strictObject({
    kind: z.literal("navigate"),
    path: z
      .string()
      .regex(/^\/(?!\/)[^\s]*$/)
      .max(500),
  }),
]);
export const postconditionSchema = z.strictObject({
  locator: locatorSchema,
  assert: z.enum(["visible", "absent", "value"]),
  value: valueSchema.optional(),
});
export const planSchema = z.strictObject({
  operations: z.array(operationSchema).min(1).max(20),
  postconditions: z.array(postconditionSchema).min(1).max(10),
});
export type Operation = z.infer<typeof operationSchema>;
export type Locator = z.infer<typeof locatorSchema>;
export type Value = z.infer<typeof valueSchema>;
export type Plan = z.infer<typeof planSchema>;
export function resolveValue(value: Value, inputs: Inputs): string {
  if ("literal" in value) return value.literal;
  if (inputs[value.input] === undefined) throw new Error("missing_input");
  return String(inputs[value.input]);
}
export function mutates(op: Operation): boolean {
  return (
    op.kind === "input" ||
    op.kind === "select" ||
    (op.kind === "click" && op.changesData)
  );
}
