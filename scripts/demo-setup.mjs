import { mkdir, readFile, writeFile, access, chmod } from "node:fs/promises";
import { randomBytes, createHash, generateKeyPairSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
config({ path: ".env", quiet: true });
if (!process.version.startsWith("v24.20."))
  throw Error("Use the project Node version in .node-version.");
const dataDir = resolve(process.env.VIBE_ZOO_DATA_DIR ?? ".local/state");
await mkdir(dataDir, { recursive: true, mode: 0o700 });
const certPath = resolve(
  process.env.VIBE_ZOO_TLS_CERT_PATH ?? ".local/tls/localhost.crt",
);
const keyPath = resolve(
  process.env.VIBE_ZOO_TLS_KEY_PATH ?? ".local/tls/localhost.key",
);
await mkdir(dirname(certPath), { recursive: true, mode: 0o700 });
await mkdir(dirname(keyPath), { recursive: true, mode: 0o700 });
const exists = async (path) =>
  access(path).then(
    () => true,
    () => false,
  );
if (!(await exists(keyPath)))
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "30",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );
await chmod(keyPath, 0o600);
if (!(await exists(certPath))) throw Error("local_certificate_missing");
if (!(await exists(".local/extension-public-key.txt"))) {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  await writeFile(
    ".local/extension-public-key.txt",
    publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    { mode: 0o600 },
  );
}
const publicKey = (
  await readFile(".local/extension-public-key.txt", "utf8")
).trim();
const extensionId = Array.from(
  createHash("sha256")
    .update(Buffer.from(publicKey, "base64"))
    .digest()
    .subarray(0, 16),
)
  .map((b) => String.fromCharCode(97 + (b >> 4), 97 + (b & 15)))
  .join("");
const local = (await exists(".local/config.json"))
  ? JSON.parse(await readFile(".local/config.json", "utf8"))
  : {};
local.extensionIds = [extensionId];
await writeFile(".local/config.json", JSON.stringify(local, null, 2) + "\n", {
  mode: 0o600,
});
const manifest = JSON.parse(
  await readFile("config/extension-manifest.json", "utf8"),
);
manifest.key = publicKey;
await mkdir("dist/extension", { recursive: true });
await writeFile(
  "dist/extension/manifest.json",
  JSON.stringify(manifest, null, 2),
);
const db = new DatabaseSync(resolve(dataDir, "vibe-zoo.sqlite"));
db.exec(
  "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL",
);
const version = Number(db.prepare("PRAGMA user_version").get().user_version);
if (version > 2) throw Error("unsupported_schema_version");
for (const [next, name] of [
  [1, "001-initial.sql"],
  [2, "002-shared-publications.sql"],
]) {
  if (version >= next) continue;
  const sql = await readFile(`src/backend/storage/migrations/${name}`, "utf8");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(sql);
    db.exec(`PRAGMA user_version=${next}; COMMIT`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
if (!(await exists(".local/demo-access.json"))) {
  if (
    db
      .prepare(
        "SELECT count(*) AS n FROM actors WHERE id IN ('demo-keeper','demo-colleague')",
      )
      .get().n
  )
    throw Error("access_file_missing_existing_data");
  const credentials = {};
  for (const actor of ["demo-keeper", "demo-colleague"]) {
    const credential = randomBytes(32).toString("base64url");
    credentials[actor] = credential;
    db.prepare("INSERT INTO actors VALUES(?,?,?)").run(
      actor,
      createHash("sha256").update(credential).digest("hex"),
      Date.now(),
    );
  }
  await writeFile(
    ".local/demo-access.json",
    JSON.stringify(credentials, null, 2) + "\n",
    { mode: 0o600 },
  );
}
const saved = JSON.parse(await readFile(".local/demo-access.json", "utf8"));
for (const actor of ["demo-keeper", "demo-colleague"]) {
  const credential = saved[actor];
  if (typeof credential !== "string" || !credential.trim())
    throw Error("local_access_code_missing");
  const hash = createHash("sha256").update(credential).digest("hex");
  const existing = db
    .prepare("SELECT credential_hash FROM actors WHERE id=?")
    .get(actor);
  if (existing && existing.credential_hash !== hash)
    throw Error("local_access_code_mismatch");
  if (!existing)
    db.prepare("INSERT INTO actors VALUES(?,?,?)").run(actor, hash, Date.now());
}
db.close();
console.log(
  "Local demo setup ready. Extension: dist/extension. Private access codes: .local/demo-access.json. Browser certificate trust requires an explicit local choice.",
);
console.log(
  JSON.stringify({
    AWS_BEARER_TOKEN_BEDROCK: Boolean(
      process.env.AWS_BEARER_TOKEN_BEDROCK?.trim(),
    ),
    AWS_REGION: Boolean(process.env.AWS_REGION?.trim()),
    BEDROCK_MODEL_ID: Boolean(process.env.BEDROCK_MODEL_ID?.trim()),
  }),
);
