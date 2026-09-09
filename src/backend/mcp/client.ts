import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { serveJobTools } from "./server.js";
export async function connectJobMcp(
  server: Awaited<ReturnType<typeof serveJobTools>>,
) {
  const client = new Client({ name: "vibe-zoo-agent", version: "0.1.0" });
  await client.connect(
    new StreamableHTTPClientTransport(server.url, {
      requestInit: { headers: { Authorization: `Bearer ${server.secret}` } },
    }),
  );
  return client;
}
