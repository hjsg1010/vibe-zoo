import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import type { Config } from "../config.js";
import { Coordinator } from "../jobs/coordinator.js";
import { ModelScheduler } from "../jobs/scheduler.js";
import {
  reserveModel,
  settleModel,
  chargeTime,
  limits,
} from "../jobs/budget.js";
import { AppError, invariant } from "../../shared/errors.js";
import { assertSafeData } from "../../shared/redaction.js";
import { log } from "../logger.js";
export interface ModelPort {
  converse(
    owner: string,
    jobId: string,
    input: Omit<ConverseCommandInput, "modelId">,
  ): Promise<ConverseCommandOutput>;
}
export class BedrockGateway implements ModelPort {
  private client: BedrockRuntimeClient;
  private scheduler = new ModelScheduler();
  constructor(
    private config: Config,
    private coordinator: Coordinator,
  ) {
    this.client = new BedrockRuntimeClient({
      region: config.region,
      token: async () => ({ token: config.bearer }),
      authSchemePreference: ["httpBearerAuth"],
      maxAttempts: 1,
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    });
  }
  async converse(
    owner: string,
    jobId: string,
    input: Omit<ConverseCommandInput, "modelId">,
  ): Promise<ConverseCommandOutput> {
    if (!this.config.bearer.trim() || !this.config.modelId.trim())
      throw new AppError("model_auth");
    if (this.config.modelId.includes("[1m]"))
      throw new AppError("invalid_input");
    const j = this.coordinator.repo.getJob(owner, jobId);
    invariant(j.binding.origin === this.config.syntheticOrigin, "forbidden");
    assertSafeData(input);
    return this.scheduler.submit(
      j.kind === "execution" ? "interactive" : "background",
      owner,
      async () => {
        let reservation = 0;
        await this.coordinator.control.run(jobId, () => {
          const current = this.coordinator.repo.getJob(owner, jobId);
          invariant(!current.cancelled, "cancelled");
          invariant(this.coordinator.browser.current(owner), "disconnected");
          const estimate = JSON.stringify(input).length;
          const budget = reserveModel(current.budget, estimate);
          reservation = budget.reservedTokens - current.budget.reservedTokens;
          this.coordinator.repo.updateJob(
            owner,
            jobId,
            current.controlRevision,
            (x) => ({ ...x, budget }),
          );
        });
        const started = Date.now();
        let usage: number | undefined;
        try {
          const result = await this.client.send(
            new ConverseCommand({
              ...input,
              modelId: this.config.modelId,
              inferenceConfig: {
                ...input.inferenceConfig,
                maxTokens: limits.maxOutput,
              },
            }),
            { abortSignal: AbortSignal.timeout(60000) },
          );
          usage = result.usage?.totalTokens;
          log("model_result", {
            durationMs: Date.now() - started,
            tokens: usage,
          });
          return result;
        } catch (error) {
          const name =
            error && typeof error === "object" && "name" in error
              ? String(error.name)
              : "";
          if (
            /UnrecognizedClient|InvalidSignature|ExpiredToken|Unauthorized/.test(
              name,
            )
          )
            throw new AppError("model_auth");
          if (/AccessDenied/.test(name)) throw new AppError("model_permission");
          if (/ResourceNotFound|Validation/.test(name))
            throw new AppError("model_not_found");
          if (/Throttling|ServiceQuota/.test(name))
            throw new AppError("model_quota");
          throw new AppError("model_unavailable");
        } finally {
          await this.coordinator.control.run(jobId, () => {
            const current = this.coordinator.repo.getJob(owner, jobId);
            this.coordinator.repo.updateJob(
              owner,
              jobId,
              current.controlRevision,
              (x) => ({
                ...x,
                budget: chargeTime(
                  settleModel(x.budget, reservation, usage),
                  Date.now() - started,
                ),
              }),
            );
          });
        }
      },
    );
  }
}
