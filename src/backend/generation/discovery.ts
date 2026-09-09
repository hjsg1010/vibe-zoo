import { z } from "zod";
import {
  discoverySchema,
  discoveredToolSchema,
  type Version,
} from "../../shared/asset-schema.js";
import {
  observationSchema,
  type Job,
  type Observation,
} from "../../shared/contracts.js";
import { assertSafeData } from "../../shared/redaction.js";
import { invariant, publicError } from "../../shared/errors.js";
import type { Coordinator } from "../jobs/coordinator.js";
import type { ModelPort } from "../model/bedrock.js";
import { fingerprint, newId } from "../storage/repository.js";
import { transaction } from "../storage/database.js";
import { inputSchema } from "../mcp/server.js";
import { generationPrompt } from "./prompts.js";

/** Discovery proposes independent Tool contracts. Execution/activation and Skills are separate. */
export class Discovery {
  constructor(
    private c: Coordinator,
    private model: ModelPort,
  ) {}
  private progress(job: Job, change: Partial<NonNullable<Job["discovery"]>>) {
    const current = this.c.repo.getJob(job.owner, job.id);
    invariant(!current.cancelled, "cancelled");
    return this.c.repo.updateJob(
      job.owner,
      job.id,
      current.controlRevision,
      (j) => ({
        ...j,
        discovery: {
          phase: "observing",
          versionIds: [],
          reused: 0,
          pages: 0,
          round: 0,
          remaining: [],
          unsupported: [],
          ...j.discovery,
          ...change,
        },
      }),
    );
  }
  async run(job: Job): Promise<{ reason: string; partial: boolean }> {
    this.progress(job, { phase: "observing" });
    const first = await this.c.execute(
      job.owner,
      job.id,
      { kind: "observe" },
      {},
    );
    invariant(first.status === "success" && first.observation, "not_observed");
    let observation = observationSchema.parse(first.observation);
    const pages: Observation[] = [observation];
    const siteKey = fingerprint(job.binding.origin);
    const known = this.c.repo
      .assets(job.owner)
      .filter((a) => a.siteKey === siteKey)
      .flatMap((a) => this.c.repo.versions(job.owner, a.id).slice(-1))
      .filter((v) => v.kind === "tool");
    const existingCount = known.length;
    const ids: string[] = [];
    const reused = new Set<string>();
    const unsupported = new Set(observation.limitations.map(String));
    let remaining: string[] = [];
    let partial = false;
    for (let round = 1; round <= 3; round++) {
      this.progress(job, { phase: "analyzing", round, pages: pages.length });
      try {
        assertSafeData(pages);
        const response = await this.model.converse(job.owner, job.id, {
          system: [{ text: generationPrompt }],
          inferenceConfig: { maxTokens: 8192 },
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: "freeze_discovery",
                  description:
                    "Propose multiple independently callable tools grounded in observed DOM; never activate or run a business action.",
                  inputSchema: {
                    json: JSON.parse(
                      JSON.stringify(z.toJSONSchema(discoverySchema)),
                    ),
                  },
                },
              },
            ],
            toolChoice: { tool: { name: "freeze_discovery" } },
          },
          messages: [
            {
              role: "user",
              content: [
                {
                  text: JSON.stringify({
                    purpose: job.purpose,
                    observations: pages,
                    existingTools: known.map((v) => ({
                      name: v.content.name,
                      description: v.content.description,
                      inputContract: v.content.inputContract,
                    })),
                    remaining,
                    roundsLeft: 4 - round,
                  }),
                },
              ],
            },
          ],
        });
        const parsed = discoverySchema
          .extend({ tools: z.array(z.unknown()).max(3) })
          .safeParse(
            response.output?.message?.content?.find(
              (b) => b.toolUse?.name === "freeze_discovery",
            )?.toolUse?.input,
          );
        if (!parsed.success) {
          this.progress(job, {
            unsupported: [
              `모델 응답 형식 오류 (${response.stopReason ?? "unknown"}); ${parsed.error.issues.map((i) => i.code).join(", ")}`,
            ],
          });
          invariant(false, "model_output_invalid");
        }
        const result = {
          ...parsed.data,
          tools: [] as z.infer<typeof discoveredToolSchema>[],
        };
        for (const [index, raw] of parsed.data.tools.entries()) {
          const candidate = discoveredToolSchema.safeParse(raw);
          if (!candidate.success) {
            unsupported.add(
              `후보 ${index + 1} 계약 오류: ${candidate.error.issues.map((i) => i.code).join(", ")}`,
            );
            partial = true;
            continue;
          }
          try {
            assertSafeData(candidate.data);
            inputSchema(candidate.data.tool).parse(
              candidate.data.exampleInputs,
            );
            inputSchema(candidate.data.tool).parse(
              candidate.data.validationInputs,
            );
            if (candidate.data.tool.inputContract.length)
              invariant(
                fingerprint(candidate.data.exampleInputs) !==
                  fingerprint(candidate.data.validationInputs),
                "invalid_input",
              );
            result.tools.push(candidate.data);
          } catch {
            unsupported.add(
              `후보 ${index + 1}의 시험 입력을 확인하지 못했습니다.`,
            );
            partial = true;
          }
        }
        assertSafeData(result);
        const current = this.c.repo.getJob(job.owner, job.id);
        invariant(!current.cancelled, "cancelled");
        invariant(
          fingerprint(this.c.browser.current(job.owner)) ===
            fingerprint(current.binding),
          "target_changed",
        );
        transaction(this.c.repo.db, () => {
          for (const candidate of result.tools) {
            const duplicate = known.find(
              (v) =>
                v.content.name === candidate.tool.name ||
                ("adapter" in v.content &&
                  fingerprint({
                    inputContract: v.content.inputContract,
                    adapter: v.content.adapter,
                  }) ===
                    fingerprint({
                      inputContract: candidate.tool.inputContract,
                      adapter: candidate.tool.adapter,
                    })),
            );
            if (duplicate) {
              reused.add(duplicate.id);
              continue;
            }
            const assetId = newId();
            this.c.repo.createAsset({
              id: assetId,
              owner: job.owner,
              siteKey,
              name: candidate.tool.name,
              description: candidate.tool.description,
              enabled: true,
              defaults: {},
              revision: 0,
              currentVersionId: null,
              previousVersionId: null,
            });
            const version: Version = {
              id: newId(),
              assetId,
              owner: job.owner,
              siteKey,
              kind: "tool",
              content: candidate.tool,
              evidence: candidate.evidenceSummary,
              createdAt: Date.now(),
              discovery: {
                sourceJobId: job.id,
                exampleInputs: candidate.exampleInputs,
                validationInputs: candidate.validationInputs,
              },
            };
            this.c.repo.saveVersion(version);
            known.push(version);
            ids.push(version.id);
          }
          remaining = result.remaining;
          result.unsupported.forEach((item) => unsupported.add(item));
        });
        this.progress(job, {
          versionIds: [...ids],
          reused: reused.size,
          remaining,
          unsupported: [...unsupported],
        });
        if (round === 3) {
          partial = !!result.inspect || remaining.length > 0;
          break;
        }
        if (result.inspect) {
          this.progress(job, { phase: "inspecting" });
          const inspect = result.inspect;
          let next;
          if ("path" in inspect) {
            invariant(
              observation.elements.some((e) => e.href === inspect.path),
              "not_observed",
            );
            next = await this.c.execute(
              job.owner,
              job.id,
              { kind: "navigate", path: inspect.path },
              {},
            );
          } else {
            invariant(
              observation.elements.some(
                (e) =>
                  e.role === inspect.role &&
                  (e.label || e.text) === inspect.label &&
                  !e.disabled,
              ),
              "not_observed",
            );
            // DOM labels cannot establish whether a button changes business data: ask once via the normal confirmation flow.
            next = await this.c.execute(
              job.owner,
              job.id,
              {
                kind: "click",
                locator: {
                  by: "role",
                  role: inspect.role,
                  value: { literal: inspect.label },
                },
                changesData: true,
              },
              {},
            );
          }
          invariant(next.status === "success", "not_observed");
          const fresh = await this.c.execute(
            job.owner,
            job.id,
            { kind: "observe" },
            {},
          );
          invariant(
            fresh.status === "success" && fresh.observation,
            "not_observed",
          );
          observation = observationSchema.parse(fresh.observation);
          observation.limitations.forEach((l) => unsupported.add(l));
          pages.push(observation);
        } else if (!remaining.length || !result.tools.length) break;
      } catch (error) {
        if (!ids.length || this.c.repo.getJob(job.owner, job.id).cancelled)
          throw error;
        unsupported.add(`추가 탐색 중단: ${publicError(error).code}`);
        partial = true;
        break;
      }
    }
    this.progress(job, {
      phase: "ready",
      pages: pages.length,
      remaining,
      unsupported: [...unsupported],
    });
    return {
      partial,
      reason: `도구 후보 ${ids.length}개를 추가했습니다. 기존 도구 ${existingCount}개는 유지했습니다. ‘도구’에서 전체 목록과 입력을 확인하고 개별 시험 실행을 해주세요. 검증을 통과한 도구만 채팅에서 사용합니다.${remaining.length ? ` 추가 관찰 필요: ${remaining.join(", ")}.` : ""}${unsupported.size ? ` 관찰 한계: ${[...unsupported].join(", ")}.` : ""}`,
    };
  }
}
