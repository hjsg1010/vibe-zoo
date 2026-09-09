import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { z } from "zod";
import type { Tool, Version } from "../../shared/asset-schema.js";
import { inputsSchema, type Inputs } from "../../shared/operation-schema.js";
import type { Outcome } from "../../shared/contracts.js";
import { invariant, publicError } from "../../shared/errors.js";
export function inputSchema(tool: Pick<Tool, "inputContract">) {
  const shape: Record<string, z.ZodType> = {};
  for (const p of tool.inputContract) {
    const field =
      p.type === "number"
        ? z.number().finite()
        : p.type === "boolean"
          ? z.boolean()
          : z.string().max(1000);
    shape[p.name] = p.required ? field : field.optional();
  }
  return z.strictObject(shape);
}
export async function serveJobTools(
  versions: Version[],
  call: (version: Version, inputs: Inputs) => Promise<Outcome>,
  settings: Map<
    string,
    { defaults: Inputs; name?: string; description?: string }
  > = new Map(),
) {
  // Multiple fixed versions can coexist after an improvement; keep each callable.
  const usedNames = new Set<string>();
  const names = versions.map((version, index) => {
    const base =
      version.kind === "tool" ? version.content.name : `skill_${index + 1}`;
    let name = base;
    let suffix = 1;
    while (usedNames.has(name)) name = `${base.slice(0, 52)}_v${++suffix}`;
    usedNames.add(name);
    return name;
  });
  const secret = randomBytes(32).toString("base64url");
  const sessions = new Set<McpServer>();
  const http = createServer((req, res) => {
    void (async () => {
      if (
        req.headers.authorization !== `Bearer ${secret}` ||
        req.url !== "/mcp" ||
        req.headers.origin
      ) {
        res.writeHead(403);
        res.end();
        return;
      }
      const mcp = new McpServer({ name: "vibe-zoo-job", version: "0.1.0" });
      sessions.add(mcp);
      for (const [index, version] of versions.entries()) {
        const tool = version.content as Tool;
        const personal = settings.get(version.id);
        const contract = inputSchema(tool);
        const defaults = personal?.defaults ?? {};
        const shape = { ...contract.shape };
        for (const key of Object.keys(defaults))
          if (shape[key]) shape[key] = shape[key].optional();
        mcp.registerTool(
          names[index]!,
          {
            description: [
              personal?.name ?? tool.name,
              personal?.description ?? tool.description,
            ].join(": "),
            inputSchema: z.strictObject(shape),
          },
          async (args) => {
            try {
              const outcome = await call(
                version,
                inputsSchema.parse(contract.parse({ ...defaults, ...args })),
              );
              return {
                content: [
                  { type: "text" as const, text: JSON.stringify(outcome) },
                ],
                isError: outcome.status !== "success",
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      status: ["disconnected", "target_changed"].includes(
                        publicError(error).code,
                      )
                        ? "unknown"
                        : "failure",
                      completed: [],
                      reason: publicError(error).code,
                    }),
                  },
                ],
                isError: true,
              };
            }
          },
        );
      }
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await mcp.connect(transport);
      res.on("close", () => {
        sessions.delete(mcp);
        void mcp.close();
      });
      await transport.handleRequest(req, res);
    })().catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  invariant(address && typeof address !== "string");
  return {
    url: new URL(`http://127.0.0.1:${address.port}/mcp`),
    secret,
    close: async () => {
      for (const session of sessions) await session.close();
      http.closeAllConnections();
      await new Promise<void>((r) => http.close(() => r()));
    },
  };
}
