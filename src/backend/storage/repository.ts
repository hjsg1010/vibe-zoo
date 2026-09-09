import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Job, Action } from "../../shared/contracts.js";
import type {
  Version,
  PersonalAsset,
  ValidationReport,
} from "../../shared/asset-schema.js";
import { invariant } from "../../shared/errors.js";
import { transaction } from "./database.js";
export const newId = (): string => randomUUID();
export function fingerprint(value: unknown): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, sorted(x)]),
          )
        : v;
  return createHash("sha256")
    .update(JSON.stringify(sorted(value)))
    .digest("hex");
}
function parse<T>(row: Record<string, unknown> | undefined): T | undefined {
  return row ? (JSON.parse(String(row.data)) as T) : undefined;
}
export class Repository {
  constructor(readonly db: DatabaseSync) {}
  actor(id: string, hash: string): void {
    this.db
      .prepare("INSERT INTO actors VALUES(?,?,?)")
      .run(id, hash, Date.now());
  }
  deleteOwner(owner: string): void {
    this.db.prepare("DELETE FROM actors WHERE id=?").run(owner);
  }
  getJob(owner: string, id: string): Job {
    const j = parse<Job>(
      this.db
        .prepare("SELECT data FROM jobs WHERE owner=? AND id=?")
        .get(owner, id),
    );
    invariant(j, "not_found");
    return j;
  }
  jobs(owner: string): Job[] {
    return this.db
      .prepare(
        "SELECT data FROM jobs WHERE owner=? ORDER BY rowid DESC LIMIT 50",
      )
      .all(owner)
      .map((r) => parse<Job>(r)!);
  }
  createJob(job: Job, activeKey?: string): Job {
    return transaction(this.db, () => {
      const existing = parse<Job>(
        this.db
          .prepare("SELECT data FROM jobs WHERE owner=? AND request_key=?")
          .get(job.owner, job.requestKey),
      );
      if (existing) {
        invariant(existing.fingerprint === job.fingerprint);
        return existing;
      }
      if (activeKey) {
        const active = parse<Job>(
          this.db
            .prepare("SELECT data FROM jobs WHERE owner=? AND active_key=?")
            .get(job.owner, activeKey),
        );
        if (active) return active;
      }
      this.db
        .prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?)")
        .run(
          job.id,
          job.owner,
          job.requestKey,
          job.fingerprint,
          activeKey ?? null,
          job.controlRevision,
          0,
          JSON.stringify(job),
        );
      return job;
    });
  }
  updateJob(
    owner: string,
    id: string,
    revision: number,
    change: (j: Job) => Job,
  ): Job {
    return transaction(this.db, () => {
      const before = this.getJob(owner, id);
      invariant(before.controlRevision === revision);
      const after = change(structuredClone(before));
      invariant(
        after.id === id &&
          after.owner === owner &&
          (!before.cancelled || after.cancelled),
      );
      after.controlRevision = revision + 1;
      after.updatedAt = Date.now();
      const finished = ["completed", "failed", "cancelled"].includes(
        after.status,
      );
      const result = this.db
        .prepare(
          "UPDATE jobs SET revision=?,cancelled=?,data=?,active_key=CASE WHEN ? THEN NULL ELSE active_key END WHERE owner=? AND id=? AND revision=?",
        )
        .run(
          after.controlRevision,
          +after.cancelled,
          JSON.stringify(after),
          +finished,
          owner,
          id,
          revision,
        );
      invariant(result.changes === 1);
      return after;
    });
  }
  cancel(owner: string, id: string, revision: number): Job {
    return this.updateJob(owner, id, revision, (j) => ({
      ...j,
      cancelled: true,
      status: "cancelled",
    }));
  }
  intent(action: Action, revision: number, reconcile = false): void {
    transaction(this.db, () => {
      const job = this.getJob(action.owner, action.jobId);
      invariant(
        (!job.cancelled || reconcile) && job.controlRevision === revision,
        "cancelled",
      );
      if (reconcile)
        invariant(
          action.command.operation.kind === "observe" &&
            this.actions(action.owner, action.jobId).some(
              (a) => a.state === "unknown",
            ),
        );
      this.db
        .prepare("INSERT INTO actions VALUES(?,?,?,?,?,?)")
        .run(
          action.id,
          action.jobId,
          action.owner,
          action.step,
          action.state,
          JSON.stringify(action),
        );
    });
  }
  action(owner: string, id: string): Action {
    const a = parse<Action>(
      this.db
        .prepare("SELECT data FROM actions WHERE owner=? AND id=?")
        .get(owner, id),
    );
    invariant(a, "not_found");
    return a;
  }
  actions(owner: string, jobId: string): Action[] {
    return this.db
      .prepare(
        "SELECT data FROM actions WHERE owner=? AND job_id=? ORDER BY step",
      )
      .all(owner, jobId)
      .map((r) => parse<Action>(r)!);
  }
  saveAction(action: Action): void {
    const r = this.db
      .prepare("UPDATE actions SET state=?,data=? WHERE owner=? AND id=?")
      .run(action.state, JSON.stringify(action), action.owner, action.id);
    invariant(r.changes === 1, "not_found");
  }
  recover(): void {
    transaction(this.db, () => {
      for (const row of this.db
        .prepare("SELECT data FROM actions WHERE state IN ('intent','sent')")
        .all()) {
        const a = parse<Action>(row)!;
        a.state = "unknown";
        this.saveAction(a);
      }
      for (const row of this.db
        .prepare("SELECT data FROM jobs WHERE cancelled=0")
        .all()) {
        const j = parse<Job>(row)!;
        if (["running", "queued", "waiting_confirmation"].includes(j.status))
          this.updateJobRawRecovery(j);
      }
    });
  }
  private updateJobRawRecovery(j: Job): void {
    j.status = "unknown";
    j.controlRevision++;
    this.db
      .prepare("UPDATE jobs SET revision=?,data=? WHERE id=?")
      .run(j.controlRevision, JSON.stringify(j), j.id);
  }
  createAsset(asset: PersonalAsset): void {
    this.db
      .prepare("INSERT INTO assets VALUES(?,?,?,?)")
      .run(asset.id, asset.owner, asset.revision, JSON.stringify(asset));
  }
  asset(owner: string, id: string): PersonalAsset {
    const a = parse<PersonalAsset>(
      this.db
        .prepare("SELECT data FROM assets WHERE owner=? AND id=?")
        .get(owner, id),
    );
    invariant(a, "not_found");
    return a;
  }
  assets(owner: string): PersonalAsset[] {
    return this.db
      .prepare("SELECT data FROM assets WHERE owner=?")
      .all(owner)
      .map((r) => parse<PersonalAsset>(r)!);
  }
  deleteAsset(owner: string, id: string): void {
    this.asset(owner, id);
    transaction(this.db, () => {
      // Publications reference versions without a foreign key, so remove
      // dependent publication rows before cascading the asset versions.
      this.db
        .prepare(
          "DELETE FROM installations WHERE publication_id IN (SELECT id FROM publications WHERE owner=? AND version_id IN (SELECT id FROM versions WHERE owner=? AND asset_id=?))",
        )
        .run(owner, owner, id);
      this.db
        .prepare(
          "DELETE FROM publications WHERE owner=? AND version_id IN (SELECT id FROM versions WHERE owner=? AND asset_id=?)",
        )
        .run(owner, owner, id);
      this.db
        .prepare("DELETE FROM assets WHERE owner=? AND id=?")
        .run(owner, id);
    });
  }
  saveVersion(v: Version): void {
    invariant(this.asset(v.owner, v.assetId));
    this.db
      .prepare("INSERT INTO versions VALUES(?,?,?,?)")
      .run(v.id, v.assetId, v.owner, JSON.stringify(v));
  }
  version(owner: string, id: string): Version {
    const v = parse<Version>(
      this.db
        .prepare("SELECT data FROM versions WHERE owner=? AND id=?")
        .get(owner, id),
    );
    invariant(v, "not_found");
    return v;
  }
  versions(owner: string, assetId: string): Version[] {
    return this.db
      .prepare(
        "SELECT data FROM versions WHERE owner=? AND asset_id=? ORDER BY rowid",
      )
      .all(owner, assetId)
      .map((r) => parse<Version>(r)!);
  }
  saveValidation(report: ValidationReport): void {
    invariant(this.getJob(report.owner, report.jobId));
    invariant(this.version(report.owner, report.versionId));
    this.db
      .prepare("INSERT INTO validations VALUES(?,?,?,?,?,?)")
      .run(
        report.id,
        report.owner,
        report.jobId,
        report.versionId,
        report.status,
        JSON.stringify(report),
      );
  }
  reports(owner: string, versionId: string): ValidationReport[] {
    return this.db
      .prepare("SELECT data FROM validations WHERE owner=? AND version_id=?")
      .all(owner, versionId)
      .map((r) => parse<ValidationReport>(r)!);
  }
  editAsset(
    owner: string,
    id: string,
    revision: number,
    edit: (a: PersonalAsset) => PersonalAsset,
  ): PersonalAsset {
    return transaction(this.db, () =>
      this.editAssetInside(owner, id, revision, edit),
    );
  }
  private editAssetInside(
    owner: string,
    id: string,
    revision: number,
    edit: (a: PersonalAsset) => PersonalAsset,
  ): PersonalAsset {
    const a = this.asset(owner, id);
    invariant(a.revision === revision);
    const next = edit(a);
    invariant(next.id === id && next.owner === owner);
    next.revision = revision + 1;
    const r = this.db
      .prepare(
        "UPDATE assets SET revision=?,data=? WHERE owner=? AND id=? AND revision=?",
      )
      .run(next.revision, JSON.stringify(next), owner, id, revision);
    invariant(r.changes === 1);
    return next;
  }
  applyImprovement(
    owner: string,
    id: string,
    revision: number,
    assetRevision: number,
    digest: string,
  ): PersonalAsset {
    return transaction(this.db, () => {
      const j = this.getJob(owner, id);
      const m = j.improvement;
      invariant(m && j.candidateId, "invalid_input");
      const a = this.asset(owner, m.assetId);
      if (m.appliedDigest) {
        invariant(m.appliedDigest === digest, "conflict");
        return a; // A later rollback must not cause a repeated apply to switch again.
      }
      invariant(!j.cancelled && j.controlRevision === revision, "cancelled");
      invariant(
        j.status === "completed" &&
          m.phase === "review" &&
          a.currentVersionId === m.baseVersionId,
        "conflict",
      );
      const v = this.version(owner, j.candidateId);
      invariant(v.assetId === a.id && v.previousId === m.baseVersionId);
      const reports = this.reports(owner, v.id).filter((r) => r.jobId === id);
      invariant(
        ["failure_reproduction", "success_regression"].every((kind) =>
          reports.some((r) => r.caseKind === kind && r.status === "passed"),
        ),
      );
      invariant(reports.every((r) => r.status === "passed"));
      const next = this.editAssetInside(owner, a.id, assetRevision, (old) => ({
        ...old,
        previousVersionId: old.currentVersionId,
        currentVersionId: v.id,
      }));
      const updated = {
        ...j,
        controlRevision: revision + 1,
        updatedAt: Date.now(),
        improvement: { ...m, appliedDigest: digest },
      };
      const r = this.db
        .prepare(
          "UPDATE jobs SET revision=?,data=? WHERE owner=? AND id=? AND revision=?",
        )
        .run(
          updated.controlRevision,
          JSON.stringify(updated),
          owner,
          id,
          revision,
        );
      invariant(r.changes === 1);
      return next;
    });
  }
  activate(
    owner: string,
    jobId: string,
    controlRevision: number,
    versionId: string,
    assetRevision: number,
    explicitImprovement = false,
  ): PersonalAsset {
    return transaction(this.db, () => {
      const j = this.getJob(owner, jobId);
      invariant(
        !j.cancelled && j.controlRevision === controlRevision,
        "cancelled",
      );
      const v = this.version(owner, versionId);
      const reports = this.reports(owner, versionId).filter(
        (r) => r.jobId === jobId && r.status === "passed",
      );
      invariant(reports.some((r) => r.caseKind === "different_input"));
      if (j.kind === "improvement")
        invariant(
          explicitImprovement &&
            reports.some((r) => r.caseKind === "failure_reproduction") &&
            reports.some((r) => r.caseKind === "success_regression"),
        );
      return this.editAssetInside(owner, v.assetId, assetRevision, (a) => ({
        ...a,
        previousVersionId: a.currentVersionId,
        currentVersionId: v.id,
      }));
    });
  }
}
