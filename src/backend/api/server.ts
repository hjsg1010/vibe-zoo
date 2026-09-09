import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { ZodError } from "zod";
import { Router } from "./router.js";
import { publicError, AppError } from "../../shared/errors.js";
import { log } from "../logger.js";
export function createHttpsServer(
  tls: { cert: string | Buffer; key: string | Buffer },
  router: Router,
  staticRoot = resolve("dist/store"),
) {
  return createServer(
    {
      cert: Buffer.isBuffer(tls.cert) ? tls.cert : readFileSync(tls.cert),
      key: Buffer.isBuffer(tls.key) ? tls.key : readFileSync(tls.key),
    },
    (req, res) => {
      void (async () => {
        const raw = req.url ?? "/";
        const path = decodeURIComponent(raw.split("?")[0]!);
        if (path.includes("..") || path.includes("\\") || path.includes("\0"))
          throw new AppError("forbidden", 403);
        if (await router.handle(req, res, path)) return;
        if (req.method !== "GET") throw new AppError("not_found", 404);
        const file = resolve(
          staticRoot,
          path === "/" ? "index.html" : `.${path}`,
        );
        if (!file.startsWith(staticRoot + sep))
          throw new AppError("forbidden", 403);
        let bytes: Buffer;
        try {
          bytes = await readFile(file);
        } catch {
          throw new AppError("not_found", 404);
        }
        res.writeHead(200, {
          "Content-Type":
            {
              ".html": "text/html; charset=utf-8",
              ".js": "text/javascript",
              ".css": "text/css",
            }[extname(file)] ?? "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",
        });
        res.end(bytes);
      })().catch((error) => {
        const safe = publicError(
          error instanceof ZodError ? new AppError("invalid_input") : error,
        );
        log("request_error", { error });
        if (!res.headersSent)
          res.writeHead(safe.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: safe.code }));
      });
    },
  );
}
