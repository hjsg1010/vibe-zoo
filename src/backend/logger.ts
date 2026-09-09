import { publicError } from "../shared/errors.js";
export function log(
  event: "started" | "stopped" | "request_error" | "model_result" | "fatal",
  detail: { error?: unknown; durationMs?: number; tokens?: number } = {},
): void {
  const safe = {
    event,
    ...(detail.error ? { code: publicError(detail.error).code } : {}),
    ...(Number.isFinite(detail.durationMs)
      ? { durationMs: detail.durationMs }
      : {}),
    ...(Number.isFinite(detail.tokens) ? { tokens: detail.tokens } : {}),
  };
  console.log(JSON.stringify(safe));
}
