import { spawn } from "node:child_process";
if (!process.version.startsWith("v24.20."))
  throw Error("Use the project Node version in .node-version.");
const child = spawn(process.execPath, ["dist/backend/main.js"], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
