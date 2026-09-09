import type {
  Message,
  Tool as BedrockTool,
} from "@aws-sdk/client-bedrock-runtime";
import {
  outcomeSchema,
  type Outcome,
  type Job,
} from "../../shared/contracts.js";
import type { Tool, Version } from "../../shared/asset-schema.js";
import { Coordinator } from "../jobs/coordinator.js";
import type { ModelPort } from "./bedrock.js";
import { agentPrompt } from "../generation/prompts.js";
import { serveJobTools } from "../mcp/server.js";
import { connectJobMcp } from "../mcp/client.js";
import { Validator } from "../mcp/validation.js";
import { invariant } from "../../shared/errors.js";
type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
export class Agent {
  constructor(
    private c: Coordinator,
    private model: ModelPort,
    private validator: Validator,
  ) {}
  async run(job: Job): Promise<void> {
    const versions = this.c.registry.resolve(job.owner, job.snapshots);
    const tools = new Map<string, Version>();
    for (const v of versions) {
      tools.set(v.id, v);
      if ("steps" in v.content)
        for (const step of v.content.steps) {
          const dependency = this.c.repo.version(job.owner, step.toolVersionId);
          tools.set(dependency.id, dependency);
        }
    }
    const server = await serveJobTools(
      [...tools.values()],
      (v, args) => this.validator.executeVersion(job.owner, job.id, v, args),
      new Map(
        job.snapshots.map((s) => [
          s.versionId,
          { defaults: s.defaults, name: s.name, description: s.description },
        ]),
      ),
    );
    const client = await connectJobMcp(server);
    let lastOutcome: Outcome | undefined;
    try {
      const listed = await client.listTools();
      const bedrockTools: BedrockTool[] = listed.tools.map((t) => ({
        toolSpec: {
          name: t.name,
          description: t.description,
          inputSchema: {
            json: JSON.parse(JSON.stringify(t.inputSchema)) as Json,
          },
        },
      }));
      const history = this.c.repo
        .jobs(job.owner)
        .filter(
          (j) =>
            j.conversationId === job.conversationId &&
            j.id !== job.id &&
            j.kind === "execution" &&
            j.outcome,
        )
        .slice(0, 4)
        .reverse();
      const previous: Message[] = history.flatMap((j) => [
        { role: "user" as const, content: [{ text: j.purpose }] },
        { role: "assistant" as const, content: [{ text: j.outcome!.reason }] },
      ]);
      const messages: Message[] = [
        ...previous,
        {
          role: "user",
          content: [
            {
              text: JSON.stringify({
                request: job.purpose,
                inputs: job.inputs,
                skills: versions
                  .filter((v) => v.kind !== "tool")
                  .map((v) => ({
                    name:
                      job.snapshots.find((s) => s.versionId === v.id)?.name ??
                      v.content.name,
                    procedure:
                      "steps" in v.content
                        ? v.content.steps.map((s) => ({
                            tool: (
                              this.c.repo.version(job.owner, s.toolVersionId)
                                .content as Tool
                            ).name,
                            arguments: Object.fromEntries(
                              Object.entries(s.arguments).filter(
                                ([key]) => !(key in s.bindings),
                              ),
                            ),
                            bindings: s.bindings,
                          }))
                        : [],
                    defaults: job.snapshots.find((s) => s.versionId === v.id)
                      ?.defaults,
                  })),
              }),
            },
          ],
        },
      ];
      for (let round = 0; round < 8; round++) {
        invariant(
          !this.c.repo.getJob(job.owner, job.id).cancelled,
          "cancelled",
        );
        const response = await this.model.converse(job.owner, job.id, {
          system: [{ text: agentPrompt }],
          messages,
          ...(bedrockTools.length
            ? { toolConfig: { tools: bedrockTools } }
            : {}),
        });
        const message = response.output?.message;
        invariant(message, "model_unavailable");
        messages.push(message);
        const uses =
          message.content?.flatMap((c) => (c.toolUse ? [c.toolUse] : [])) ?? [];
        if (!uses.length) {
          const reason =
            message.content?.map((c) => c.text ?? "").join("") ?? "";
          const current = this.c.repo.getJob(job.owner, job.id);
          if (!current.cancelled)
            this.c.repo.updateJob(
              job.owner,
              job.id,
              current.controlRevision,
              (j) => ({
                ...j,
                status: "completed",
                outcome: {
                  status: lastOutcome?.status ?? "success",
                  completed: lastOutcome?.completed ?? [],
                  reason: reason.slice(0, 1000),
                },
              }),
            );
          return;
        }
        const results: NonNullable<Message["content"]> = [];
        for (const use of uses) {
          invariant(use.name && use.toolUseId);
          const result = await client.callTool(
            { name: use.name, arguments: use.input as Record<string, unknown> },
            { timeout: 300000 },
          );
          const resultText = result.content.find((c) => c.type === "text");
          if (resultText?.type === "text") {
            try {
              const parsed = outcomeSchema.safeParse(
                JSON.parse(resultText.text),
              );
              if (parsed.success) lastOutcome = parsed.data;
            } catch {
              /* Non-outcome MCP errors are handled below. */
            }
          }
          if (result.isError && !lastOutcome)
            lastOutcome = {
              status: "failure",
              completed: [],
              reason: "도구 실행 실패",
            };
          results.push({
            toolResult: {
              toolUseId: use.toolUseId,
              status: result.isError ? "error" : "success",
              content: [{ text: JSON.stringify(result.content) }],
            },
          });
        }
        messages.push({ role: "user", content: results });
      }
      throw Error("budget_exhausted");
    } finally {
      await client.close();
      await server.close();
    }
  }
}
