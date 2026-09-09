import { z } from "zod";
import {
  type Publication,
  type Installation,
} from "../../shared/publication.js";
import {
  type Version,
  skillSchema,
  toolSchema,
} from "../../shared/asset-schema.js";
import { type Job } from "../../shared/contracts.js";
import { inputsSchema } from "../../shared/operation-schema.js";
import { assertSafeData } from "../../shared/redaction.js";
import { invariant } from "../../shared/errors.js";
import { Repository, fingerprint, newId } from "../storage/repository.js";
import { transaction } from "../storage/database.js";
import { Coordinator } from "../jobs/coordinator.js";
import { Validator } from "../mcp/validation.js";
import { inputSchema } from "../mcp/server.js";
export const publishSchema = z.strictObject({
  versionId: z.string(),
  revision: z.number().int(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(600),
  author: z.string().trim().min(1).max(80),
  previewDigest: z.string().optional(),
});
export class AssetStore {
  constructor(
    private c: Coordinator,
    private validator: Validator,
    _legacyOrigin?: string,
  ) {}
  private get repo(): Repository {
    return this.c.repo;
  }
  preview(
    owner: string,
    id: string,
    raw: unknown,
  ): { publication: Omit<Publication, "id" | "createdAt">; digest: string } {
    const data = publishSchema.parse(raw);
    assertSafeData(data);
    const asset = this.repo.asset(owner, id);
    const main = this.repo.version(owner, data.versionId);
    invariant(
      asset.revision === data.revision &&
        main.assetId === asset.id &&
        main.siteKey === asset.siteKey,
      "conflict",
    );
    const versions: Version[] = [];
    const visit = (v: Version) => {
      if (versions.some((x) => x.id === v.id)) return;
      invariant(
        this.repo.reports(owner, v.id).some((r) => r.status === "passed"),
        "not_observed",
      );
      if ("steps" in v.content)
        for (const step of v.content.steps)
          visit(this.repo.version(owner, step.toolVersionId));
      versions.push(v);
    };
    visit(main);
    const refs = new Map(versions.map((v, i) => [v.id, `asset_${i + 1}`]));
    const publication = {
      name: data.name,
      description: data.description,
      author: data.author,
      scope: "게시자가 검증한 웹앱 · 설치자 재검증 필요",
      siteKey: main.siteKey,
      mainRef: refs.get(main.id)!,
      versions: versions.map((v) => ({
        ref: refs.get(v.id)!,
        kind: v.kind,
        content:
          "steps" in v.content
            ? {
                ...skillSchema.parse(v.content),
                steps: v.content.steps.map((s) => ({
                  ...s,
                  arguments: Object.fromEntries(
                    Object.entries(s.arguments).filter(
                      ([key]) => !(key in s.bindings),
                    ),
                  ),
                  toolVersionId: refs.get(s.toolVersionId)!,
                })),
              }
            : toolSchema.parse(v.content),
      })),
      validation:
        "게시자의 해당 버전 검증 통과. 설치자는 자기 로그인 탭에서 다시 검증해야 합니다.",
      limitations:
        "게시자가 관찰·검증한 DOM 기능 범위. 로그인·개인 기본값·시연 근거는 공유하지 않습니다.",
    };
    assertSafeData(publication);
    const text = JSON.stringify(publication);
    invariant(
      !/https?:\/\/|\.ts\.net|localhost|127\.0\.0\.1|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(
        text,
      ),
      "invalid_input",
    );
    const privateValues = [
      ...Object.values(asset.defaults),
      ...this.repo
        .jobs(owner)
        .flatMap((j) => Object.values(j.learning?.sourceInputs ?? {})),
    ];
    invariant(
      !privateValues.some(
        (v) => typeof v === "string" && v.length >= 4 && text.includes(v),
      ),
      "invalid_input",
    );
    return { publication, digest: fingerprint(publication) };
  }
  publish(owner: string, id: string, raw: unknown): Publication {
    const data = publishSchema.parse(raw);
    const preview = this.preview(owner, id, data);
    invariant(data.previewDigest === preview.digest, "conflict");
    return transaction(this.repo.db, () => {
      const prior = this.repo.db
        .prepare("SELECT data FROM publications WHERE owner=? AND version_id=?")
        .get(owner, data.versionId);
      if (prior) {
        const publication = JSON.parse(String(prior.data)) as Publication;
        const { id: _id, createdAt: _time, ...snapshot } = publication;
        invariant(fingerprint(snapshot) === preview.digest, "conflict");
        return publication;
      }
      const publication: Publication = {
        ...preview.publication,
        id: newId(),
        createdAt: Date.now(),
      };
      this.repo.db
        .prepare("INSERT INTO publications VALUES(?,?,?,?)")
        .run(
          publication.id,
          owner,
          data.versionId,
          JSON.stringify(publication),
        );
      return publication;
    });
  }
  publication(id: string): Publication {
    const row = this.repo.db
      .prepare("SELECT data FROM publications WHERE id=?")
      .get(id);
    invariant(row, "not_found");
    const publication = JSON.parse(String(row.data)) as Publication;
    if (!publication.siteKey) {
      const source = this.repo.db
        .prepare(
          "SELECT v.data FROM versions v JOIN publications p ON p.version_id=v.id WHERE p.id=?",
        )
        .get(id);
      const installed = this.repo.db
        .prepare(
          "SELECT v.data FROM versions v JOIN installations i ON json_extract(i.data, '$.versionId')=v.id WHERE i.publication_id=? LIMIT 1",
        )
        .get(id);
      const data = source?.data ?? installed?.data;
      if (data)
        publication.siteKey = (JSON.parse(String(data)) as Version).siteKey;
    }
    return publication;
  }
  installation(owner: string, id: string): Installation | undefined {
    const row = this.repo.db
      .prepare(
        "SELECT data FROM installations WHERE owner=? AND publication_id=?",
      )
      .get(owner, id);
    return row ? (JSON.parse(String(row.data)) as Installation) : undefined;
  }
  install(owner: string, id: string): Installation {
    const publication = this.publication(id);
    return transaction(this.repo.db, () => {
      const prior = this.installation(owner, id);
      if (prior) return prior;
      const map = Object.fromEntries(
        publication.versions.map((v) => [v.ref, newId()]),
      );
      let mainAsset = "";
      for (const shared of publication.versions) {
        const assetId = newId();
        if (shared.ref === publication.mainRef) mainAsset = assetId;
        const content =
          "steps" in shared.content
            ? {
                ...shared.content,
                steps: shared.content.steps.map((s) => ({
                  ...s,
                  toolVersionId: map[s.toolVersionId]!,
                })),
              }
            : shared.content;
        const siteKey = publication.siteKey;
        invariant(siteKey, "not_observed");
        this.repo.createAsset({
          id: assetId,
          owner,
          name:
            shared.ref === publication.mainRef
              ? publication.name
              : content.name,
          description:
            shared.ref === publication.mainRef
              ? publication.description
              : content.description,
          siteKey,
          enabled: true,
          defaults: {},
          revision: 0,
          currentVersionId: null,
          previousVersionId: null,
        });
        this.repo.saveVersion({
          id: map[shared.ref]!,
          assetId,
          owner,
          kind: shared.kind,
          siteKey,
          content,
          evidence: "Store에서 선택한 고정 버전. 설치자 자체 검증 전.",
          createdAt: Date.now(),
        });
      }
      const installation: Installation = {
        id: newId(),
        publicationId: id,
        assetId: mainAsset,
        versionId: map[publication.mainRef]!,
        versions: map,
        sourceInputs: {},
      };
      this.repo.db
        .prepare("INSERT INTO installations VALUES(?,?,?,?)")
        .run(installation.id, owner, id, JSON.stringify(installation));
      return installation;
    });
  }
  async validate(job: Job): Promise<void> {
    invariant(job.installation, "invalid_input");
    const request = job.installation;
    const installed = this.installation(job.owner, request.publicationId);
    invariant(installed, "not_found");
    const all = Object.values(installed.versions).filter(
      (v) =>
        v !== installed.versionId &&
        this.repo.asset(job.owner, this.repo.version(job.owner, v).assetId)
          .currentVersionId !== v,
    );
    const cases = [
      ...all.map((versionId) => ({
        versionId,
        inputs: request.dependencyInputs[versionId]!,
      })),
      { versionId: installed.versionId, inputs: job.inputs },
    ];
    for (const item of cases) {
      const version = this.repo.version(job.owner, item.versionId);
      inputSchema(version.content).parse(item.inputs);
    }
    const parameterized = cases.filter(
      (item) =>
        this.repo.version(job.owner, item.versionId).content.inputContract
          .length > 0,
    );
    invariant(
      new Set(parameterized.map((item) => fingerprint(item.inputs))).size ===
        parameterized.length,
      "invalid_input",
    );
    for (const item of cases) {
      const v = this.repo.version(job.owner, item.versionId);
      const report = await this.validator.run(
        job.owner,
        job.id,
        v,
        item.inputs,
        {},
      );
      const current = this.repo.getJob(job.owner, job.id);
      if (current.cancelled) return;
      if (report.status !== "passed") {
        this.repo.updateJob(
          job.owner,
          job.id,
          current.controlRevision,
          (j) => ({
            ...j,
            status: report.status === "unknown" ? "unknown" : "failed",
            outcome: {
              status: report.status === "unknown" ? "unknown" : "partial",
              completed: [],
              reason:
                "설치 자산의 일부 검증을 완료하지 못했습니다. 이전 변경은 반복하지 않습니다.",
            },
          }),
        );
        return;
      }
      this.repo.activate(
        job.owner,
        job.id,
        current.controlRevision,
        v.id,
        this.repo.asset(job.owner, v.assetId).revision,
      );
    }
    const current = this.repo.getJob(job.owner, job.id);
    this.repo.updateJob(job.owner, job.id, current.controlRevision, (j) => ({
      ...j,
      status: "completed",
      outcome: {
        status: "success",
        completed: [],
        reason:
          "설치자 자신의 탭에서 의존 도구와 선택 자산을 각각 검증했습니다.",
      },
    }));
  }
}
export const installValidationSchema = z.strictObject({
  publicationId: z.string(),
  dependencyInputs: z.record(z.string(), inputsSchema),
});
