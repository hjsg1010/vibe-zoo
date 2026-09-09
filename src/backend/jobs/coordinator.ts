import type { z } from "zod";
import {
  requestSchema,
  type Job,
  type BrowserCommand,
  type Receipt,
  type Confirmation,
  type Binding,
  type Outcome,
} from "../../shared/contracts.js";
import type { Operation, Inputs, Plan } from "../../shared/operation-schema.js";
import { mutates } from "../../shared/operation-schema.js";
import { AppError, invariant } from "../../shared/errors.js";
import { Repository, newId, fingerprint } from "../storage/repository.js";
import { SerialControl, TargetSlots } from "./control.js";
import { reserveBrowser, chargeTime } from "./budget.js";
import { Registry } from "../assets/registry.js";
export interface BrowserPort {
  current(owner: string): Binding | undefined;
  enqueue(owner: string, command: BrowserCommand): Promise<Receipt>;
}
export class Coordinator {
  readonly control = new SerialControl();
  readonly slots = new TargetSlots();
  private confirmations = new Map<
    string,
    { proposal: Confirmation; resume: () => void; reject: (e: unknown) => void }
  >();
  constructor(
    readonly repo: Repository,
    readonly browser: BrowserPort,
    readonly registry: Registry,
  ) {
    for (const row of repo.db.prepare("SELECT data FROM jobs").all()) {
      const job = JSON.parse(String(row.data)) as Job;
      if (
        repo
          .actions(job.owner, job.id)
          .some((a) => ["unknown", "intent", "sent"].includes(a.state))
      )
        this.slots.acquire(this.targetKey(job), job.id);
    }
  }
  prepare(
    owner: string,
    raw: z.infer<typeof requestSchema>,
    kind: Job["kind"] = "generation",
    context?: unknown,
  ): Job {
    const request = requestSchema.parse(raw);
    invariant(
      fingerprint(this.browser.current(owner)) === fingerprint(request.binding),
      "target_changed",
    );
    const now = Date.now();
    const siteKey = fingerprint(request.binding.origin);
    const j: Job = {
      id: newId(),
      owner,
      kind,
      ...request,
      fingerprint: fingerprint({ kind, request, context }),
      status: "queued",
      cancelled: false,
      controlRevision: 0,
      inputRevision: 0,
      snapshots: this.registry.select(owner, siteKey),
      budget: {
        activeMs: 0,
        browserOps: 0,
        reconcileOps: 0,
        modelRequests: 0,
        tokens: 0,
        reservedTokens: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.createJob(
      j,
      kind === "generation"
        ? fingerprint({ siteKey, purpose: j.purpose, context })
        : undefined,
    );
  }
  async cancel(owner: string, id: string, revision: number): Promise<Job> {
    return this.control.run(id, () => {
      const j = this.repo.cancel(owner, id, revision);
      const pending = this.confirmations.get(id);
      this.confirmations.delete(id);
      pending?.reject(new AppError("cancelled"));
      return j;
    });
  }
  confirmation(owner: string, id: string): Confirmation | undefined {
    this.repo.getJob(owner, id);
    return this.confirmations.get(id)?.proposal;
  }
  async confirm(
    owner: string,
    id: string,
    revision: number,
    actionId: string,
  ): Promise<Job> {
    return this.control.run(id, () => {
      const j = this.repo.getJob(owner, id);
      const waiting = this.confirmations.get(id);
      invariant(
        waiting &&
          waiting.proposal.actionId === actionId &&
          j.controlRevision === revision &&
          !j.cancelled,
      );
      invariant(
        fingerprint(waiting.proposal.binding) ===
          fingerprint(this.browser.current(owner)),
        "target_changed",
      );
      const updated = this.repo.updateJob(owner, id, revision, (x) => ({
        ...x,
        status: "running",
      }));
      this.confirmations.delete(id);
      waiting.resume();
      return updated;
    });
  }
  async supplement(
    owner: string,
    id: string,
    revision: number,
    inputs: Inputs,
  ): Promise<Job> {
    return this.control.run(id, () =>
      this.repo.updateJob(owner, id, revision, (j) => {
        invariant(j.status === "waiting_input" && !j.cancelled);
        return {
          ...j,
          inputs: { ...j.inputs, ...inputs },
          inputRevision: j.inputRevision + 1,
          status: "queued",
        };
      }),
    );
  }
  private targetKey(j: Job): string {
    return `${j.owner}:${j.binding.instance}:${j.binding.tabId}`;
  }
  async reconcile(owner: string, id: string, revision: number): Promise<Job> {
    const original = this.repo
      .actions(owner, id)
      .find(
        (a) =>
          a.state === "unknown" ||
          (a.receipt?.outcome.status === "unknown" && !a.reconciliation),
      );
    invariant(original, "conflict");
    invariant(
      original.command.postconditions.length > 0 ||
        !mutates(original.command.operation),
      "not_observed",
    );
    await this.control.run(id, () => {
      const j = this.repo.getJob(owner, id);
      const current = this.browser.current(owner);
      invariant(
        current &&
          (current.instance === j.binding.instance ||
            this.repo
              .actions(owner, id)
              .every((a) => !mutates(a.command.operation))) &&
          current.tabId === j.binding.tabId &&
          current.origin === j.binding.origin,
        "target_changed",
      );
      this.repo.updateJob(owner, id, revision, (x) => {
        if (original.state !== "unknown")
          this.repo.saveAction({ ...original, state: "unknown" });
        return { ...x, binding: current };
      });
    });
    const outcome = await this.execute(
      owner,
      id,
      { kind: "observe" },
      original.command.inputs,
      original.command.postconditions,
      true,
    );
    return this.control.run(id, () => {
      const actions = this.repo.actions(owner, id);
      const evidence = actions.at(-1)!;
      const old = this.repo.action(owner, original.id);
      this.repo.saveAction({
        ...old,
        state: outcome.status === "success" ? "observed" : "unknown",
        reconciliation: {
          actionId: evidence.id,
          outcome: original.command.postconditions.length
            ? outcome
            : {
                ...outcome,
                status: "interrupted",
                completed: [],
                reason:
                  "읽기 전용 연결을 재확인했습니다. 이전 업무의 성공은 확인하지 않았습니다.",
              },
        },
      });
      const j = this.repo.getJob(owner, id);
      const updated = this.repo.updateJob(
        owner,
        id,
        j.controlRevision,
        (x) => ({
          ...x,
          status: x.cancelled
            ? "cancelled"
            : outcome.status === "success"
              ? original.command.postconditions.length
                ? "completed"
                : "failed"
              : "unknown",
          outcome: original.command.postconditions.length
            ? outcome
            : {
                ...outcome,
                status: "interrupted",
                completed: [],
                reason:
                  "읽기 전용 연결을 재확인했습니다. 후보 검증을 새 입력으로 시작할 수 있습니다.",
              },
        }),
      );
      if (!this.repo.actions(owner, id).some((a) => a.state === "unknown"))
        this.slots.release(this.targetKey(updated), id);
      return updated;
    });
  }
  async reviewNotExecuted(
    owner: string,
    id: string,
    revision: number,
    reason: string,
  ): Promise<Job> {
    return this.control.run(id, () => {
      const job = this.repo.getJob(owner, id);
      invariant(job.controlRevision === revision, "conflict");
      invariant(
        ["failed", "unknown", "cancelled"].includes(job.status),
        "conflict",
      );
      const actions = this.repo.actions(owner, id);
      invariant(
        !actions.some((a) => ["intent", "sent"].includes(a.state)),
        "conflict",
      );
      const original = actions.find(
        (a) =>
          a.state === "unknown" ||
          (a.receipt?.outcome.status === "unknown" && !job.nonExecutionReview),
      );
      const evidence = actions.at(-1);
      invariant(
        original &&
          evidence &&
          evidence.id !== original.id &&
          evidence.command.operation.kind === "observe" &&
          evidence.receipt,
        "not_observed",
      );
      invariant(
        evidence.command.postconditions.length > 0 &&
          fingerprint(evidence.command.postconditions) ===
            fingerprint(original.command.postconditions),
        "not_observed",
      );
      invariant(
        fingerprint(
          evidence.receipt.nextBinding ?? evidence.receipt.binding,
        ) === fingerprint(this.browser.current(owner)),
        "target_changed",
      );
      invariant(Date.now() - job.updatedAt < 120000, "target_changed");
      // This records an explicit human review plus fresh read-only evidence, never business success.
      const outcome: Outcome = {
        status: "interrupted",
        completed: [],
        reason:
          "미실행 근거를 확인했다는 사용자 검토를 기록했습니다. 이전 작업의 성공 판정은 아닙니다.",
      };
      const updated = this.repo.updateJob(owner, id, revision, (j) => {
        this.repo.saveAction({
          ...original,
          state: "observed",
          reconciliation: { actionId: evidence.id, outcome },
        });
        this.repo.saveAction({ ...evidence, state: "observed" });
        return {
          ...j,
          status: j.cancelled ? "cancelled" : "failed",
          nonExecutionReview: {
            actionId: original.id,
            evidenceActionId: evidence.id,
            reason,
            at: Date.now(),
          },
          outcome,
        };
      });
      this.slots.release(this.targetKey(updated), id);
      return updated;
    });
  }
  async execute(
    owner: string,
    id: string,
    operation: Operation,
    inputs: Inputs,
    postconditions: Plan["postconditions"] = [],
    reconcile = false,
  ): Promise<Outcome> {
    const initial = this.repo.getJob(owner, id);
    const slot = this.targetKey(initial);
    invariant(this.slots.acquire(slot, id), "conflict");
    try {
      if (mutates(operation)) {
        let wait!: Promise<void>;
        await this.control.run(id, () => {
          const j = this.repo.getJob(owner, id);
          invariant(!j.cancelled, "cancelled");
          const updated = this.repo.updateJob(
            owner,
            id,
            j.controlRevision,
            (x) => ({ ...x, status: "waiting_confirmation" }),
          );
          wait = new Promise<void>((resume, reject) => {
            this.confirmations.set(id, {
              proposal: {
                actionId: newId(),
                jobId: id,
                controlRevision: updated.controlRevision,
                inputRevision: j.inputRevision,
                binding: j.binding,
                operation,
                inputs,
                versionIds: j.snapshots.map((s) => s.versionId),
              },
              resume,
              reject,
            });
          });
        });
        await wait;
      }
      let receiptPromise!: Promise<Receipt>;
      let command!: BrowserCommand;
      const started = Date.now();
      await this.control.run(id, () => {
        const j = this.repo.getJob(owner, id);
        invariant(!j.cancelled || reconcile, "cancelled");
        invariant(!reconcile || !mutates(operation), "invalid_input");
        invariant(
          fingerprint(j.binding) === fingerprint(this.browser.current(owner)),
          "target_changed",
        );
        const previous = this.repo.actions(owner, id);
        invariant(
          reconcile || !previous.some((a) => a.state === "unknown"),
          "conflict",
        );
        const next = this.repo.updateJob(owner, id, j.controlRevision, (x) => ({
          ...x,
          status: reconcile ? x.status : "running",
          budget: reserveBrowser(x.budget, reconcile),
        }));
        command = {
          type: "action",
          actionId: newId(),
          jobId: id,
          controlRevision: next.controlRevision,
          binding: next.binding,
          expiresAt: Date.now() + 30000,
          operation,
          inputs,
          postconditions,
        };
        const action = {
          id: command.actionId,
          jobId: id,
          owner,
          step: previous.length,
          state: "intent" as const,
          command,
        };
        // Cancelled jobs only reconcile previously recorded actions, never create new work.
        this.repo.intent(action, next.controlRevision, reconcile);
        try {
          receiptPromise = this.browser.enqueue(owner, command);
          this.repo.saveAction({ ...action, state: "sent" });
        } catch (error) {
          this.repo.saveAction({ ...action, state: "unknown" });
          throw error;
        }
      });
      try {
        const receipt = await receiptPromise;
        return await this.control.run(id, () => {
          const a = this.repo.action(owner, command.actionId);
          invariant(
            receipt.actionId === a.id &&
              receipt.jobId === id &&
              receipt.controlRevision === command.controlRevision &&
              fingerprint(receipt.binding) === fingerprint(command.binding),
            "target_changed",
          );
          this.repo.saveAction({
            ...a,
            state:
              receipt.outcome.status === "unknown" ? "unknown" : "observed",
            receipt,
          });
          const j = this.repo.getJob(owner, id);
          this.repo.updateJob(owner, id, j.controlRevision, (x) => ({
            ...x,
            status:
              receipt.outcome.status === "unknown" && !x.cancelled
                ? "unknown"
                : x.status,
            binding: receipt.nextBinding ?? x.binding,
            budget: chargeTime(x.budget, Date.now() - started),
          }));
          return receipt.outcome;
        });
      } catch (error) {
        await this.control.run(id, () => {
          const a = this.repo.action(owner, command.actionId);
          this.repo.saveAction({ ...a, state: "unknown" });
          const j = this.repo.getJob(owner, id);
          this.repo.updateJob(owner, id, j.controlRevision, (x) => ({
            ...x,
            status: x.cancelled ? "cancelled" : "unknown",
            budget: chargeTime(x.budget, Date.now() - started),
          }));
        });
        throw error;
      }
    } finally {
      if (
        !this.repo
          .actions(owner, id)
          .some((a) => ["unknown", "intent", "sent"].includes(a.state))
      )
        this.slots.release(slot, id);
    }
  }
}
