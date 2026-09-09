import type { Binding, BrowserCommand } from "../shared/contracts.js";
import { AppError } from "../shared/errors.js";
export function assertTarget(command: BrowserCommand, current: Binding): void {
  for (const field of [
    "instance",
    "connection",
    "tabId",
    "documentId",
    "origin",
    "path",
    "revision",
  ] as const)
    if (command.binding[field] !== current[field])
      throw new AppError("target_changed");
  if (command.expiresAt < Date.now()) throw new AppError("target_changed");
}
export class ActionLedger {
  private entries = new Map<string, "started" | "finished">();
  begin(id: string): void {
    if (this.entries.has(id)) throw new AppError("conflict");
    this.entries.set(id, "started");
  }
  finish(id: string): void {
    this.entries.set(id, "finished");
  }
}

export function nextBinding(
  command: BrowserCommand,
  checkpoint: { documentId: string; origin: string; path: string },
): Binding | undefined {
  if (checkpoint.origin !== command.binding.origin)
    throw new AppError("target_changed");
  if (
    checkpoint.documentId === command.binding.documentId &&
    checkpoint.path === command.binding.path
  )
    return undefined;
  if (
    command.operation.kind !== "click" &&
    command.operation.kind !== "navigate"
  )
    throw new AppError("target_changed");
  return {
    ...command.binding,
    documentId: checkpoint.documentId,
    origin: checkpoint.origin,
    path: checkpoint.path,
    revision: command.binding.revision + 1,
  };
}
