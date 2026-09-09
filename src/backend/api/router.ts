import type { Improvement } from "../generation/improvement.js";
import type { AssetStore } from "../assets/store.js";
import { installValidationSchema } from "../assets/store.js";
import { Settings } from "../assets/settings.js";
import type { SkillLearner } from "../generation/skills.js";
import { recordingSchema } from "../../shared/recording.js";
import { bindingSchema } from "../../shared/contracts.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { Auth } from "../auth.js";
import { Coordinator } from "../jobs/coordinator.js";
import { AppError, publicError } from "../../shared/errors.js";
import {
  requestSchema,
  controlSchema,
  type Job,
} from "../../shared/contracts.js";
import { inputsSchema, mutates } from "../../shared/operation-schema.js";
import { fingerprint } from "../storage/repository.js";
import { invariant } from "../../shared/errors.js";
import { assertSafeData } from "../../shared/redaction.js";
export type Workflow = (job: Job) => Promise<void>;
export class Router {
  workflow?: Workflow;
  learner?: SkillLearner;
  store?: AssetStore;
  improvement?: Improvement;
  constructor(
    readonly auth: Auth,
    readonly coordinator: Coordinator,
    readonly origin: string,
    readonly extensionOrigins: () => string[],
  ) {}
  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
  ): Promise<boolean> {
    const method = req.method ?? "GET";
    if (path === "/health" && method === "GET") {
      this.json(res, 200, { status: "ok" });
      return true;
    }
    if (!path.startsWith("/api/")) return false;
    const origin = req.headers.origin;
    if (
      origin &&
      origin !== this.origin &&
      !this.extensionOrigins().includes(origin)
    )
      throw new AppError("forbidden", 403);
    if (origin && this.extensionOrigins().includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    }
    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return true;
    }
    if (method !== "GET" && !origin) throw new AppError("forbidden", 403);
    if (path === "/api/session" && method === "POST") {
      const { credential } = z
        .strictObject({ credential: z.string().max(512) })
        .parse(await this.body(req));
      const token = this.auth.issue(credential);
      res.setHeader(
        "Set-Cookie",
        `vibe_session=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
      );
      this.json(res, 200, { token });
      return true;
    }
    const cookie = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("vibe_session="))
      ?.slice(13);
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : cookie;
    const owner = this.auth.owner(token);
    const c = this.coordinator;
    const improveAsset = path.match(
      /^\/api\/assets\/([^/]+)\/(improvement-cases|rollback)$/,
    );
    if (
      improveAsset &&
      ((improveAsset[2] === "improvement-cases" && method === "GET") ||
        (improveAsset[2] === "rollback" && method === "POST"))
    ) {
      invariant(this.improvement, "not_found");
      this.json(
        res,
        200,
        improveAsset[2] === "rollback"
          ? {
              asset: this.improvement.rollback(
                owner,
                improveAsset[1]!,
                await this.body(req),
              ),
            }
          : this.improvement.cases(owner, improveAsset[1]!),
      );
      return true;
    }
    if (path === "/api/improvement" && method === "POST") {
      invariant(this.improvement, "not_found");
      const j = this.improvement.start(owner, await this.body(req));
      if (j.improvement?.phase === "proposing" && this.workflow)
        void this.workflow(j).catch((error) => this.fail(j, error));
      this.json(res, 202, { job: j });
      return true;
    }
    const improve = path.match(
      /^\/api\/improvement\/([^/]+)(?:\/(validate|apply))?$/,
    );
    if (
      improve &&
      ((method === "GET" && !improve[2]) || (method === "POST" && improve[2]))
    ) {
      invariant(this.improvement, "not_found");
      if (improve[2] === "validate") {
        const j = this.improvement.queue(
          owner,
          improve[1]!,
          await this.body(req),
        );
        if (j.improvement?.phase === "queued" && this.workflow)
          void this.workflow(j).catch((error) => this.fail(j, error));
        this.json(res, 202, { job: j });
      } else if (improve[2] === "apply") {
        this.json(res, 200, {
          asset: this.improvement.apply(
            owner,
            improve[1]!,
            await this.body(req),
          ),
        });
      } else this.json(res, 200, this.improvement.detail(owner, improve[1]!));
      return true;
    }
    if (path.startsWith("/api/record/") && method === "POST") {
      invariant(this.learner, "not_found");
      if (path === "/api/record/start") {
        const data = z
          .strictObject({ binding: bindingSchema })
          .parse(await this.body(req));
        this.json(res, 200, this.learner.start(owner, data.binding));
        return true;
      }
      if (path === "/api/record/stop") {
        const data = z
          .strictObject({ id: z.string(), binding: bindingSchema })
          .parse(await this.body(req));
        this.learner.stop(owner, data.id, data.binding);
        this.json(res, 200, { ok: true });
        return true;
      }
      if (path === "/api/record/cancel") {
        const data = z
          .strictObject({ id: z.string() })
          .parse(await this.body(req));
        this.learner.cancel(owner, data.id);
        this.json(res, 200, { ok: true });
        return true;
      }
      if (path === "/api/record/submit") {
        const data = z
          .strictObject({
            id: z.string(),
            request: requestSchema,
            recording: recordingSchema,
          })
          .parse(await this.body(req));
        const accepted = this.learner.submit(
          owner,
          data.id,
          data.request,
          data.recording,
        );
        if (accepted.evidence)
          void this.learner
            .compile(accepted.job, accepted.evidence)
            .catch((error) => this.fail(accepted.job, error));
        this.json(res, 202, { job: accepted.job });
        return true;
      }
    }
    const learning = path.match(/^\/api\/learning\/([^/]+)\/validate$/);
    if (learning && method === "POST") {
      invariant(this.learner, "not_found");
      const data = z
        .strictObject({
          revision: z.number().int(),
          inputRevision: z.number().int(),
          candidateId: z.string(),
          inputs: inputsSchema,
        })
        .parse(await this.body(req));
      const job = this.learner.supplement(owner, learning[1]!, data);
      if (job.status === "queued" && this.workflow)
        void this.workflow(job).catch((error) => this.fail(job, error));
      this.json(res, 202, { job });
      return true;
    }
    if (path === "/api/logout" && method === "POST") {
      this.auth.revoke(token!);
      res.setHeader(
        "Set-Cookie",
        "vibe_session=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      );
      this.json(res, 200, { ok: true });
      return true;
    }
    if (path === "/api/state" && method === "GET") {
      const currentBinding = c.browser.current(owner);
      this.json(res, 200, {
        binding: currentBinding ?? null,
        jobs: c.repo.jobs(owner).map((j) => ({
          ...j,
          confirmation: c.confirmation(owner, j.id),
          hasUnknownActions: c.repo
            .actions(owner, j.id)
            .some(
              (a) =>
                a.state === "unknown" ||
                (a.receipt?.outcome.status === "unknown" &&
                  !a.reconciliation &&
                  !j.nonExecutionReview),
            ),
          canReviewNonExecution:
            c.repo.actions(owner, j.id).at(-1)?.command.operation.kind ===
              "observe" &&
            c.repo.actions(owner, j.id).some((a) => a.reconciliation),
          validationInputs:
            c.repo
              .actions(owner, j.id)
              .find((a) => Object.keys(a.command.inputs).length)?.command
              .inputs ?? {},
        })),
        assets: c.repo
          .assets(owner)
          .filter(
            (a) =>
              !currentBinding ||
              a.siteKey === fingerprint(currentBinding.origin),
          )
          .map((a) => {
            const v = c.repo.versions(owner, a.id).at(-1);
            return {
              ...a,
              kind: v?.kind,
              candidateVersionId: v?.id,
              inputContract: v?.content.inputContract,
            };
          }),
      });
      return true;
    }
    const assetDetail = path.match(/^\/api\/assets\/([^/]+)\/details$/);
    if (assetDetail && method === "GET") {
      const asset = c.repo.asset(owner, assetDetail[1]!);
      const version = asset.currentVersionId
        ? c.repo.version(owner, asset.currentVersionId)
        : c.repo.versions(owner, asset.id).at(-1);
      invariant(version, "not_found");
      const dependencies =
        "steps" in version.content
          ? version.content.steps.map((step) => {
              const tool = c.repo.version(owner, step.toolVersionId);
              return {
                versionId: tool.id,
                name: tool.content.name,
                description: tool.content.description,
              };
            })
          : [];
      this.json(res, 200, {
        version,
        dependencies,
        active: asset.currentVersionId === version.id,
      });
      return true;
    }
    if (path === "/api/catalog" && method === "GET") {
      this.json(res, 200, {
        items: c.repo.db
          .prepare("SELECT data FROM publications ORDER BY rowid DESC")
          .all()
          .map((r) => {
            const publication = JSON.parse(String(r.data));
            return {
              ...publication,
              installation: this.store?.installation(owner, publication.id),
            };
          }),
      });
      return true;
    }
    const publish = path.match(
      /^\/api\/assets\/([^/]+)\/(publication-preview|publish)$/,
    );
    if (publish && method === "POST") {
      invariant(this.store, "not_found");
      const raw = await this.body(req);
      this.json(
        res,
        200,
        publish[2] === "publish"
          ? { publication: this.store.publish(owner, publish[1]!, raw) }
          : this.store.preview(owner, publish[1]!, raw),
      );
      return true;
    }
    const install = path.match(/^\/api\/publications\/([^/]+)\/install$/);
    if (install && method === "POST") {
      invariant(this.store, "not_found");
      z.strictObject({}).parse(await this.body(req));
      this.json(res, 200, {
        installation: this.store.install(owner, install[1]!),
      });
      return true;
    }
    if (path === "/api/installation/validate" && method === "POST") {
      invariant(this.store, "not_found");
      const data = z
        .strictObject({
          request: requestSchema,
          validation: installValidationSchema,
        })
        .parse(await this.body(req));
      assertSafeData(data);
      const installed = this.store.installation(
        owner,
        data.validation.publicationId,
      );
      invariant(installed, "not_found");
      invariant(
        !c.repo.asset(owner, installed.assetId).currentVersionId,
        "conflict",
      );
      let job = c.prepare(owner, data.request, "install", data.validation);
      if (!job.installation) {
        job = c.repo.updateJob(owner, job.id, job.controlRevision, (j) => ({
          ...j,
          installation: data.validation,
        }));
        if (this.workflow)
          void this.workflow(job).catch((error) => this.fail(job, error));
      }
      this.json(res, 202, { job });
      return true;
    }
    const settings = path.match(/^\/api\/assets\/([^/]+)\/settings$/);
    if (settings) {
      const service = new Settings(c.repo);
      if (method === "GET") {
        this.json(res, 200, service.detail(owner, settings[1]!));
        return true;
      }
      if (method === "POST") {
        this.json(res, 200, {
          asset: service.save(owner, settings[1]!, await this.body(req)),
        });
        return true;
      }
    }
    const assetValidation = path.match(/^\/api\/assets\/([^/]+)\/validate$/);
    if (assetValidation && method === "POST") {
      const data = z
        .strictObject({
          versionId: z.string(),
          inputs: inputsSchema,
          request: requestSchema,
        })
        .parse(await this.body(req));
      assertSafeData(data);
      const asset = c.repo.asset(owner, assetValidation[1]!);
      const version = c.repo.version(owner, data.versionId);
      invariant(
        version.assetId === asset.id && !asset.currentVersionId,
        "conflict",
      );
      const prior = c.repo.reports(owner, version.id).at(-1);
      invariant(prior && prior.status !== "passed", "not_observed");
      const source = c.repo.getJob(owner, prior.jobId);
      invariant(
        ["failed", "completed", "cancelled"].includes(source.status) &&
          !c.repo
            .actions(owner, source.id)
            .some((a) => ["unknown", "intent", "sent"].includes(a.state)),
        "conflict",
      );
      invariant(
        fingerprint(data.inputs) !== fingerprint(prior.inputs),
        "invalid_input",
      );
      let j = c.prepare(owner, data.request, "generation", {
        versionId: version.id,
        inputs: data.inputs,
      });
      if (!j.assetValidation) {
        j = c.repo.updateJob(owner, j.id, j.controlRevision, (x) => ({
          ...x,
          budget: { ...source.budget },
          candidateId: version.id,
          assetValidation: {
            versionId: version.id,
            inputs: data.inputs,
            sourceInputs: prior.inputs,
            sourceJobId: source.id,
          },
        }));
        if (this.workflow)
          void this.workflow(j).catch((error) => {
            const latest = c.repo.getJob(owner, j.id);
            if (!latest.cancelled)
              c.repo.updateJob(owner, j.id, latest.controlRevision, (x) => ({
                ...x,
                status: x.status === "unknown" ? "unknown" : "failed",
                outcome: {
                  status: x.status === "unknown" ? "unknown" : "failure",
                  completed: [],
                  reason: `개별 검증을 중단했습니다 (${publicError(error).code}).`,
                },
              }));
          });
      }
      this.json(res, 202, { job: j });
      return true;
    }
    const repair = path.match(/^\/api\/jobs\/([^/]+)\/repair-validator$/);
    if (repair && method === "POST") {
      const data = z
        .strictObject({ revision: z.number().int().nonnegative() })
        .parse(await this.body(req));
      const source = c.repo.getJob(owner, repair[1]!);
      const current = c.browser.current(owner);
      invariant(
        source.status === "unknown" &&
          !source.cancelled &&
          !source.validatorRepair &&
          source.validationRequest &&
          current,
        "conflict",
      );
      invariant(
        current.instance === source.binding.instance &&
          current.tabId === source.binding.tabId &&
          current.documentId === source.binding.documentId &&
          current.origin === source.binding.origin &&
          current.path === source.binding.path,
        "target_changed",
      );
      const j = c.repo.updateJob(owner, source.id, data.revision, (x) => ({
        ...x,
        binding: current,
        validatorRepair: "requested",
      }));
      if (this.workflow)
        void this.workflow(j).catch((error) => {
          const latest = c.repo.getJob(owner, j.id);
          if (!latest.cancelled)
            c.repo.updateJob(owner, j.id, latest.controlRevision, (x) => ({
              ...x,
              validatorRepair: "finished",
              outcome: {
                status: "unknown",
                completed: [],
                reason: `검증 조건 수정을 중단했습니다 (${publicError(error).code}).`,
              },
            }));
        });
      this.json(res, 202, { job: j });
      return true;
    }
    if (path === "/api/validate-candidate" && method === "POST") {
      const data = z
        .strictObject({
          sourceJobId: z.string(),
          revision: z.number().int(),
          request: requestSchema,
          toolInputs: inputsSchema,
          skillInputs: inputsSchema,
          newCase: z.literal(true).optional(),
        })
        .parse(await this.body(req));
      assertSafeData(data);
      const source = c.repo.getJob(owner, data.sourceJobId);
      invariant(
        source.controlRevision === data.revision &&
          source.candidateId &&
          ["failed", "unknown", "completed"].includes(source.status),
      );
      const actions = c.repo.actions(owner, source.id);
      invariant(
        !actions.some(
          (a) =>
            a.state === "unknown" ||
            (a.receipt?.outcome.status === "unknown" &&
              !a.reconciliation &&
              !source.nonExecutionReview) ||
            (mutates(a.command.operation) &&
              a.receipt?.outcome.completed.length &&
              !(
                data.newCase &&
                source.nonExecutionReview &&
                (a.command.operation.kind === "input" ||
                  a.command.operation.kind === "select" ||
                  a.id === source.nonExecutionReview.actionId)
              )),
        ),
        "conflict",
      );
      const sourceInputs =
        actions.find((a) => Object.keys(a.command.inputs).length)?.command
          .inputs ?? {};
      invariant(
        fingerprint(data.toolInputs) !== fingerprint(sourceInputs) &&
          fingerprint(data.skillInputs) !== fingerprint(sourceInputs) &&
          fingerprint(data.skillInputs) !== fingerprint(data.toolInputs),
        "invalid_input",
      );
      let j = c.prepare(owner, data.request, "generation", {
        candidateId: source.candidateId,
        toolInputs: data.toolInputs,
        skillInputs: data.skillInputs,
      });
      if (j.validationRequest) {
        this.json(res, 202, { job: j });
        return true;
      }
      j = c.repo.updateJob(owner, j.id, j.controlRevision, (x) => ({
        ...x,
        budget: { ...source.budget },
        candidateId: source.candidateId,
        validationRequest: {
          sourceJobId: source.id,
          toolInputs: data.toolInputs,
          skillInputs: data.skillInputs,
          sourceInputs,
        },
      }));
      if (this.workflow)
        void this.workflow(j).catch((error) => {
          const current = c.repo.getJob(owner, j.id);
          if (!current.cancelled)
            c.repo.updateJob(owner, j.id, current.controlRevision, (x) => ({
              ...x,
              status: x.status === "unknown" ? "unknown" : "failed",
              outcome: {
                status: x.status === "unknown" ? "unknown" : "failure",
                completed: [],
                reason: `후보 검증을 중단했습니다 (${publicError(error).code}).`,
              },
            }));
        });
      this.json(res, 202, { job: j });
      return true;
    }
    if (
      (path === "/api/prepare" || path === "/api/chat") &&
      method === "POST"
    ) {
      const raw = await this.body(req);
      assertSafeData(raw);
      const j = c.prepare(
        owner,
        requestSchema.parse(raw),
        path === "/api/chat" ? "execution" : "generation",
      );
      if (j.status === "queued" && this.workflow)
        void this.workflow(j).catch((error) => {
          const current = c.repo.getJob(owner, j.id);
          if (!current.cancelled)
            c.repo.updateJob(owner, j.id, current.controlRevision, (x) => ({
              ...x,
              status: x.status === "unknown" ? "unknown" : "failed",
              outcome: {
                status: x.status === "unknown" ? "unknown" : "failure",
                completed: [],
                reason:
                  publicError(error).code === "model_output_invalid"
                    ? "생성 응답이 도구 계약을 충족하지 못했습니다. 생성 후보는 활성화하지 않았습니다."
                    : `작업을 완료하지 못했습니다 (${publicError(error).code}). 연결과 입력을 확인해주세요.`,
              },
            }));
        });
      this.json(res, 202, { job: j });
      return true;
    }
    const match = /^\/api\/jobs\/([^/]+)\/control$/.exec(path);
    if (match && method === "POST") {
      const data = controlSchema.parse(await this.body(req));
      let j: Job;
      if (data.action === "cancel")
        j = await c.cancel(owner, match[1]!, data.revision);
      else if (data.action === "reconcile")
        j = await c.reconcile(owner, match[1]!, data.revision);
      else if (data.action === "review_not_executed" && data.reviewReason) {
        assertSafeData(data.reviewReason);
        j = await c.reviewNotExecuted(
          owner,
          match[1]!,
          data.revision,
          data.reviewReason,
        );
      } else if (data.action === "confirm" && data.actionId)
        j = await c.confirm(owner, match[1]!, data.revision, data.actionId);
      else if (data.action === "supplement" && data.inputs) {
        assertSafeData(data.inputs);
        j = await c.supplement(owner, match[1]!, data.revision, data.inputs);
      } else throw new AppError("invalid_input");
      this.json(res, 200, { job: j });
      return true;
    }
    throw new AppError("not_found", 404);
  }
  private fail(job: Job, error: unknown): void {
    const c = this.coordinator;
    const current = c.repo.getJob(job.owner, job.id);
    if (!current.cancelled)
      c.repo.updateJob(job.owner, job.id, current.controlRevision, (j) => ({
        ...j,
        status: j.status === "unknown" ? "unknown" : "failed",
        outcome: {
          status: j.status === "unknown" ? "unknown" : "failure",
          completed: [],
          reason: `작업을 중단했습니다 (${publicError(error).code}).`,
        },
      }));
  }
  private async body(req: IncomingMessage): Promise<unknown> {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw new AppError("invalid_input");
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      const b = Buffer.from(chunk as Uint8Array);
      size += b.length;
      if (size > 256 * 1024) throw new AppError("invalid_input", 413);
      chunks.push(b);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
    } catch {
      throw new AppError("invalid_input");
    }
  }
  private json(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
}
