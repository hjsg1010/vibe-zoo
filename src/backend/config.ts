import { config as dotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { AppError } from "../shared/errors.js";
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  dotenv({ path: resolve(".env"), processEnv: env, quiet: true });
  const localSchema = z.object({
    extensionIds: z.array(z.string().regex(/^[a-p]{32}$/)).default([]),
    syntheticOrigin: z.string().url().optional(),
  });
  const local = existsSync(".local/config.json")
    ? localSchema.parse(JSON.parse(readFileSync(".local/config.json", "utf8")))
    : { extensionIds: [] };
  const port = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .parse(env.VIBE_ZOO_PORT ?? 18443);
  const origin = z
    .string()
    .url()
    .parse(env.VIBE_ZOO_PUBLIC_ORIGIN ?? `https://localhost:${port}`);
  if (new URL(origin).protocol !== "https:")
    throw new AppError("invalid_input");
  return {
    host: env.VIBE_ZOO_BIND_HOST ?? "127.0.0.1",
    port,
    origin,
    dataDir: resolve(env.VIBE_ZOO_DATA_DIR ?? ".local/state"),
    cert: resolve(env.VIBE_ZOO_TLS_CERT_PATH ?? ".local/tls/localhost.crt"),
    key: resolve(env.VIBE_ZOO_TLS_KEY_PATH ?? ".local/tls/localhost.key"),
    extensionIds: env.VIBE_ZOO_ALLOWED_EXTENSION_IDS
      ? env.VIBE_ZOO_ALLOWED_EXTENSION_IDS.split(",").filter(Boolean)
      : local.extensionIds,
    syntheticOrigin:
      env.VIBE_ZOO_SYNTHETIC_DEMO_ORIGIN ?? local.syntheticOrigin ?? "",
    region: env.AWS_REGION ?? "ap-northeast-2",
    modelId: env.BEDROCK_MODEL_ID ?? "",
    bearer: env.AWS_BEARER_TOKEN_BEDROCK ?? "",
  };
}
export type Config = ReturnType<typeof loadConfig>;
