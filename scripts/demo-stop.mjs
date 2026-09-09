import { readdir, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
const root = await realpath(process.cwd());
let stopped = 0;
for (const name of await readdir("/proc")) {
  if (!/^\d+$/.test(name)) continue;
  try {
    const cwd = await realpath(`/proc/${name}/cwd`);
    const args = (await readFile(`/proc/${name}/cmdline`, "utf8")).split("\0");
    if (
      cwd === root &&
      args.some(
        (arg) =>
          arg === "dist/backend/main.js" ||
          arg === resolve(root, "dist/backend/main.js"),
      )
    ) {
      process.kill(Number(name), "SIGTERM");
      stopped++;
    }
  } catch (error) {
    if (!["ENOENT", "ESRCH", "EACCES"].includes(error.code)) throw error;
  }
}
console.log(
  JSON.stringify({
    event: "stop_requested",
    backends: stopped,
    data: "preserved",
  }),
);
