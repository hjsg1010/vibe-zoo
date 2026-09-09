import { Improvement } from "./generation/improvement.js";
import { AssetStore } from "./assets/store.js";
import { SkillLearner } from "./generation/skills.js";
import { BedrockGateway } from "./model/bedrock.js";
import { Agent } from "./model/agent.js";
import { Validator } from "./mcp/validation.js";
import { ToolGenerator } from "./generation/tools.js";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { openDatabase } from "./storage/database.js";
import { migrate } from "./storage/migrate.js";
import { Repository } from "./storage/repository.js";
import { Registry } from "./assets/registry.js";
import { Auth } from "./auth.js";
import { Coordinator, type BrowserPort } from "./jobs/coordinator.js";
import { Router } from "./api/router.js";
import { createHttpsServer } from "./api/server.js";
import { Bridge } from "./bridge.js";
import { log } from "./logger.js";
export function start() {
  const config = loadConfig();
  const db = openDatabase(join(config.dataDir, "vibe-zoo.sqlite"));
  migrate(db);
  const repo = new Repository(db);
  repo.recover();
  const auth = new Auth(repo);
  const port: BrowserPort = {
    current: (o) => bridge.current(o),
    enqueue: (o, c) => bridge.enqueue(o, c),
  };
  const coordinator = new Coordinator(repo, port, new Registry(repo));
  const origins = () =>
    config.extensionIds.map((id) => `chrome-extension://${id}`);
  const router = new Router(auth, coordinator, config.origin, origins);
  const server = createHttpsServer(
    { cert: config.cert, key: config.key },
    router,
  );
  const bridge = new Bridge(server, auth, origins);
  const model = new BedrockGateway(config, coordinator);
  const validator = new Validator(coordinator);
  const generator = new ToolGenerator(
    coordinator,
    model,
    validator,
    config.syntheticOrigin,
  );
  const learner = new SkillLearner(
    coordinator,
    model,
    validator,
    config.syntheticOrigin,
  );
  router.learner = learner;
  const store = new AssetStore(coordinator, validator, config.syntheticOrigin);
  router.store = store;
  const improvement = new Improvement(
    coordinator,
    model,
    validator,
    config.syntheticOrigin,
  );
  router.improvement = improvement;
  const agent = new Agent(coordinator, model, validator);
  const running = new Set<string>();
  router.workflow = async (job) => {
    if (running.has(job.id)) return;
    running.add(job.id);
    try {
      if (job.kind === "generation") await generator.run(job);
      else if (job.kind === "learning") await learner.validate(job);
      else if (job.kind === "improvement") await improvement.run(job);
      else if (job.kind === "install") await store.validate(job);
      else await agent.run(job);
    } finally {
      running.delete(job.id);
    }
  };
  server.listen(config.port, config.host, () => log("started"));
  const close = () => {
    bridge.close();
    server.close(() => {
      db.close();
      log("stopped");
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return { server, router, coordinator, close, config };
}
if (process.argv[1]?.endsWith("/main.js")) {
  process.on("uncaughtException", (error) => {
    log("fatal", { error });
    process.exit(1);
  });
  process.on("unhandledRejection", (error) => {
    log("fatal", { error });
    process.exit(1);
  });
  start();
}
