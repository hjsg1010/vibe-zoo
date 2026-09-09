import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:https";
import { WebSocket } from "ws";
import { openDatabase } from "../../src/backend/storage/database.js";
import { migrate } from "../../src/backend/storage/migrate.js";
import { Repository } from "../../src/backend/storage/repository.js";
import { Registry } from "../../src/backend/assets/registry.js";
import { Auth } from "../../src/backend/auth.js";
import { Coordinator } from "../../src/backend/jobs/coordinator.js";
import { Router } from "../../src/backend/api/router.js";
import { createHttpsServer } from "../../src/backend/api/server.js";
import { Bridge } from "../../src/backend/bridge.js";
import { binding } from "../helpers/fixtures.js";
it("enforces auth, origin, actual TLS/WSS binding, body limits and static paths without leaking errors", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vibe-zoo-tls-"));
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(dir, "key.pem"),
      "-out",
      join(dir, "cert.pem"),
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );
  const ca = readFileSync(join(dir, "cert.pem"));
  const db = openDatabase(":memory:");
  migrate(db);
  const repo = new Repository(db);
  const credential = "synthetic-demo-credential-at-least-24";
  repo.actor("alice", Auth.credentialHash(credential));
  const auth = new Auth(repo);
  const coordinator = new Coordinator(
    repo,
    {
      current: (o) => bridge.current(o),
      enqueue: (o, c) => bridge.enqueue(o, c),
    },
    new Registry(repo),
  );
  const extension = "chrome-extension://synthetic-extension";
  const router = new Router(auth, coordinator, "https://localhost", () => [
    extension,
  ]);
  const server = createHttpsServer(
    { cert: ca, key: readFileSync(join(dir, "key.pem")) },
    router,
    dir,
  );
  const bridge = new Bridge(server, auth, () => [extension]);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error();
  const port = address.port;
  const call = (
    path: string,
    method = "GET",
    data?: unknown,
    token?: string,
    origin = extension,
  ) =>
    new Promise<{ status: number; body: string; corsCredentials:string|undefined }>((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          ca,
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => {
            body += String(c);
          });
          res.on("end", () => resolve({ status: res.statusCode!, body, corsCredentials:res.headers["access-control-allow-credentials"] as string|undefined }));
        },
      );
      req.on("error", reject);
      req.end(data === undefined ? undefined : JSON.stringify(data));
    });
  let ws: WebSocket | undefined;
  try {
    expect((await call("/health")).status).toBe(200);
    expect((await call("/api/state")).status).toBe(401);
    expect(
      (
        await call(
          "/api/session",
          "POST",
          { credential },
          undefined,
          "https://evil.example.org",
        )
      ).status,
    ).toBe(403);
    const session = await call("/api/session", "POST", { credential });
    expect(session.status).toBe(200);
    expect(session.corsCredentials).toBe("true");
    const token = (JSON.parse(session.body) as { token: string }).token;
    ws = new WebSocket(`wss://127.0.0.1:${port}/bridge`, {
      ca,
      origin: extension,
    });
    await new Promise<void>((r, j) => {
      ws!.once("open", r);
      ws!.once("error", j);
    });
    const bound = new Promise<string>((r) =>
      ws!.once("message", (m) => r(m.toString())),
    );
    const { connection: _c, revision: _r, ...helloBinding } = binding;
    ws.send(JSON.stringify({ type: "hello", token, binding: helloBinding }));
    expect(JSON.parse(await bound).type).toBe("bound");
    expect((await call("/api/state", "GET", undefined, token)).body).toContain(
      "fixture-extension",
    );
    expect((await call("/%2e%2e/package.json")).status).toBe(403);
    const huge = await call(
      "/api/prepare",
      "POST",
      { data: "x".repeat(270000) },
      token,
    );
    expect(huge.status).toBe(413);
    expect(huge.body).not.toContain(credential);
    await call("/api/logout", "POST", {}, token);
    expect((await call("/api/state", "GET", undefined, token)).status).toBe(
      401,
    );
    expect(bridge.current("alice")).toBeUndefined();
  } finally {
    ws?.terminate();
    bridge.close();
    await new Promise<void>((r) => server.close(() => r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
