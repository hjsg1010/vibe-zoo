import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
const files = execFileSync(
  "git",
  ["ls-files", "-co", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
let secret = "";
try {
  secret = parse(await readFile(".env")).AWS_BEARER_TOKEN_BEDROCK?.trim() ?? "";
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const findings = [];
const forbidden =
  /^(?:\.env(?:\.|$)|\.local\/|node_modules\/|dist\/)|\.(?:zip|sqlite(?:-[a-z]+)?|db|pem|key|crt)$/i;
for (const file of new Set(files)) {
  if (forbidden.test(file) && file !== ".env.example") {
    findings.push({ file, reason: "private/runtime artifact" });
    continue;
  }
  if (/\.(?:png|jpg|jpeg|gif|webm|mp4|woff2?)$/i.test(file)) continue;
  const text = await readFile(file, "utf8");
  if (secret && text.includes(secret))
    findings.push({ file, reason: "configured model credential" });
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(
      text,
    )
  )
    findings.push({ file, reason: "credential pattern" });
  if (
    /\b[\w-]+(?:\.[\w-]+)*\.ts\.net\b|\/mnt\/c\/Users\/[^\s/]+|\/home\/[^\s/]+\//.test(
      text,
    )
  )
    findings.push({ file, reason: "private host or personal path" });
}
const envTracked = execFileSync("git", ["ls-files", "--", ".env"], {
  encoding: "utf8",
}).trim();
if (envTracked)
  findings.push({ file: ".env", reason: "must remain untracked" });
if (findings.length) {
  console.log(JSON.stringify({ status: "failed", findings }));
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify({
      status: "passed",
      files: new Set(files).size,
      note: "Text/artifact checks only; images require visual review.",
    }),
  );
