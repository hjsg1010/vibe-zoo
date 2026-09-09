import type {
  Version,
  Tool,
  ValidationReport,
  Skill,
} from "../../shared/asset-schema.js";
import type { Inputs } from "../../shared/operation-schema.js";
import type { Outcome } from "../../shared/contracts.js";
import { Coordinator } from "../jobs/coordinator.js";
import { fingerprint, newId } from "../storage/repository.js";
import { invariant } from "../../shared/errors.js";
import { serveJobTools, inputSchema } from "./server.js";
import { connectJobMcp } from "./client.js";
export class Validator {
  constructor(private c: Coordinator) {}
  async executeTool(
    owner: string,
    jobId: string,
    version: Version,
    inputs: Inputs,
  ): Promise<Outcome> {
    const job = this.c.repo.getJob(owner, jobId);
    invariant(!job.cancelled, "cancelled");
    invariant(
      version.owner === owner &&
        version.siteKey === fingerprint(job.binding.origin),
      "forbidden",
    );
    const tool = version.content as Tool;
    inputSchema(tool).parse(inputs);
    const completed: number[] = [];
    let latest: Outcome = { status: "unknown", completed, reason: "실행 전" };
    for (const [index, operation] of tool.adapter.operations.entries()) {
      latest = await this.c.execute(
        owner,
        jobId,
        operation,
        inputs,
        index === tool.adapter.operations.length - 1
          ? tool.adapter.postconditions
          : [],
      );
      if (latest.status !== "success")
        return {
          ...latest,
          status:
            latest.status === "unknown"
              ? "unknown"
              : completed.length
                ? "partial"
                : latest.status,
          completed,
        };
      completed.push(index);
    }
    return { ...latest, completed };
  }
  async executeVersion(
    owner: string,
    jobId: string,
    version: Version,
    inputs: Inputs,
  ): Promise<Outcome> {
    if (version.kind === "tool")
      return this.executeTool(owner, jobId, version, inputs);
    const skill = version.content as Skill;
    inputSchema(skill).parse(inputs);
    let outcome: Outcome = {
      status: "success",
      completed: [],
      reason: "Skill 단계 사후 조건 확인",
    };
    for (const [index, step] of skill.steps.entries()) {
      const tool = this.c.repo.version(owner, step.toolVersionId);
      const args = { ...step.arguments };
      for (const [key, source] of Object.entries(step.bindings)) {
        invariant(inputs[source] !== undefined, "invalid_input");
        args[key] = inputs[source]!;
      }
      const result = await this.throughMcp(owner, jobId, tool, args);
      if (result.status !== "success")
        return {
          ...result,
          status:
            result.status === "unknown"
              ? "unknown"
              : index
                ? "partial"
                : result.status,
          completed: outcome.completed,
        };
      outcome = { ...result, completed: [...outcome.completed, index] };
    }
    return outcome;
  }
  async run(
    owner: string,
    jobId: string,
    version: Version,
    inputs: Inputs,
    originalInputs: Inputs,
    caseKind: ValidationReport["caseKind"] = "different_input",
  ): Promise<ValidationReport> {
    if (caseKind === "different_input")
      invariant(
        fingerprint(inputs) !== fingerprint(originalInputs),
        "invalid_input",
      );
    const before = this.c.repo.actions(owner, jobId).length;
    let outcome: Outcome;
    if (version.kind === "tool")
      outcome = await this.throughMcp(owner, jobId, version, inputs);
    else outcome = await this.executeVersion(owner, jobId, version, inputs);
    const report: ValidationReport = {
      id: newId(),
      owner,
      jobId,
      versionId: version.id,
      caseKind,
      inputs,
      status:
        outcome.status === "success"
          ? "passed"
          : outcome.status === "unknown"
            ? "unknown"
            : "failed",
      actionIds: this.c.repo
        .actions(owner, jobId)
        .slice(before)
        .map((a) => a.id),
      createdAt: Date.now(),
    };
    this.c.repo.saveValidation(report);
    return report;
  }
  async throughMcp(
    owner: string,
    jobId: string,
    version: Version,
    inputs: Inputs,
  ): Promise<Outcome> {
    const server = await serveJobTools([version], (v, args) =>
      this.executeTool(owner, jobId, v, args),
    );
    let client: Awaited<ReturnType<typeof connectJobMcp>> | undefined;
    try {
      client = await connectJobMcp(server);
      const listed = await client.listTools();
      invariant(listed.tools.length === 1);
      const result = await client.callTool(
        { name: listed.tools[0]!.name, arguments: inputs },
        { timeout: 300000 },
      );
      const text = result.content.find((c) => c.type === "text");
      invariant(text && text.type === "text");
      return JSON.parse(text.text) as Outcome;
    } finally {
      await client?.close();
      await server.close();
    }
  }
}
