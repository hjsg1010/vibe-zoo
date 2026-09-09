import type { Budget } from "../../shared/contracts.js";
import { AppError } from "../../shared/errors.js";
export const limits = {
  activeMs: 300_000,
  browserOps: 60,
  reconcileOps: 5,
  modelRequests: 8,
  maxOutput: 4096,
  totalTokens: 60_000,
} as const;
export function reserveModel(b: Budget, inputEstimate: number): Budget {
  const reserved = Math.max(1, Math.ceil(inputEstimate)) + limits.maxOutput;
  if (
    b.modelRequests >= limits.modelRequests ||
    b.tokens + b.reservedTokens + reserved > limits.totalTokens ||
    b.activeMs >= limits.activeMs
  )
    throw new AppError("budget_exhausted");
  return {
    ...b,
    modelRequests: b.modelRequests + 1,
    reservedTokens: b.reservedTokens + reserved,
  };
}
export function settleModel(
  b: Budget,
  reservation: number,
  usage?: number,
): Budget {
  // An unknown response may have been billed: retain its reservation.
  return usage === undefined
    ? b
    : {
        ...b,
        reservedTokens: Math.max(0, b.reservedTokens - reservation),
        tokens: b.tokens + usage,
      };
}
export function reserveBrowser(b: Budget, reconcile = false): Budget {
  if (
    b.activeMs >= limits.activeMs ||
    b.browserOps >= limits.browserOps ||
    (reconcile && b.reconcileOps >= limits.reconcileOps) ||
    (!reconcile && b.browserOps >= limits.browserOps - limits.reconcileOps)
  )
    throw new AppError("budget_exhausted");
  return {
    ...b,
    browserOps: b.browserOps + 1,
    reconcileOps: b.reconcileOps + (reconcile ? 1 : 0),
  };
}
export function chargeTime(b: Budget, ms: number): Budget {
  return { ...b, activeMs: b.activeMs + Math.max(0, ms) };
}
