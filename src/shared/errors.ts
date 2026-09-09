export type ErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "cancelled"
  | "budget_exhausted"
  | "disconnected"
  | "target_changed"
  | "unsupported"
  | "ambiguous"
  | "not_observed"
  | "model_output_invalid"
  | "model_auth"
  | "model_permission"
  | "model_not_found"
  | "model_quota"
  | "model_unavailable"
  | "internal";
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status = 400,
  ) {
    super(code);
  }
}
export function publicError(error: unknown): {
  code: ErrorCode;
  status: number;
} {
  return error instanceof AppError
    ? { code: error.code, status: error.status }
    : { code: "internal", status: 500 };
}
export function invariant(
  condition: unknown,
  code: ErrorCode = "conflict",
): asserts condition {
  if (!condition) throw new AppError(code, code === "not_found" ? 404 : 409);
}
