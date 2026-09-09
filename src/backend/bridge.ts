import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:https";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  bindingSchema,
  receiptSchema,
  type Binding,
  type BrowserCommand,
  type Receipt,
} from "../shared/contracts.js";
import { AppError, invariant } from "../shared/errors.js";
import { Auth } from "./auth.js";
import { fingerprint } from "./storage/repository.js";
import type { BrowserPort } from "./jobs/coordinator.js";
const helloSchema = z.strictObject({
  type: z.literal("hello"),
  token: z.string().max(512),
  binding: bindingSchema.omit({ connection: true, revision: true }),
});
export class Bridge implements BrowserPort {
  private connections = new Map<
    string,
    { socket: WebSocket; binding: Binding; token: string }
  >();
  private pending = new Map<
    string,
    {
      owner: string;
      connection: string;
      command: BrowserCommand;
      resolve: (r: Receipt) => void;
      reject: (e: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  readonly wss: WebSocketServer;
  constructor(
    server: Server,
    private auth: Auth,
    private allowedOrigins: () => string[],
  ) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
    server.on("upgrade", (req, socket, head) => {
      if (
        req.url !== "/bridge" ||
        !this.allowedOrigins().includes(req.headers.origin ?? "")
      ) {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.connect(ws));
    });
  }
  private connect(socket: WebSocket): void {
    let owner: string | undefined;
    let connection = "";
    const deadline = setTimeout(() => socket.close(1008), 5000);
    const heartbeat=setInterval(()=>{if(owner&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:"heartbeat"}));},20000);
    socket.on("message", (raw) => {
      try {
        const message: unknown = JSON.parse(raw.toString());
        if (!owner) {
          const hello = helloSchema.parse(message);
          owner = this.auth.owner(hello.token);
          connection = randomUUID();
          const old = this.connections.get(owner);
          if (old) {
            old.socket.close(1000);
            this.rejectConnection(old.binding.connection);
          }
          const binding = {
            ...hello.binding,
            connection,
            revision: (old?.binding.revision ?? -1) + 1,
          };
          this.connections.set(owner, { socket, binding, token: hello.token });
          clearTimeout(deadline);
          socket.send(JSON.stringify({ type: "bound", binding }));
          return;
        }
        const current = this.connections.get(owner);
        invariant(current?.socket === socket, "target_changed");
        this.auth.owner(current.token);
        if(z.strictObject({type:z.literal("heartbeat")}).safeParse(message).success)return;
        const receipt = receiptSchema.parse(message);
        const pending = this.pending.get(receipt.actionId);
        invariant(
          pending &&
            pending.owner === owner &&
            pending.connection === connection &&
            fingerprint(receipt.binding) === fingerprint(current.binding),
          "target_changed",
        );
        if (receipt.nextBinding) {
          const next = receipt.nextBinding;
          invariant(
            (pending.command.operation.kind === "click" ||
              pending.command.operation.kind === "navigate") &&
              next.connection === current.binding.connection &&
              next.instance === current.binding.instance &&
              next.tabId === current.binding.tabId &&
              next.origin === current.binding.origin &&
              next.revision === current.binding.revision + 1,
            "target_changed",
          );
          current.binding = next;
        }
        clearTimeout(pending.timer);
        this.pending.delete(receipt.actionId);
        pending.resolve(receipt);
      } catch {
        socket.close(1008);
      }
    });
    socket.on("error", () => socket.close());
    socket.on("close", () => {
      clearTimeout(deadline);
      clearInterval(heartbeat);
      if (owner && this.connections.get(owner)?.socket === socket)
        this.connections.delete(owner);
      this.rejectConnection(connection);
    });
  }
  private rejectConnection(connection: string): void {
    for (const [id, p] of this.pending)
      if (p.connection === connection) {
        clearTimeout(p.timer);
        this.pending.delete(id);
        p.reject(new AppError("disconnected"));
      }
  }
  current(owner: string): Binding | undefined {
    const c = this.connections.get(owner);
    if (!c) return undefined;
    try {
      this.auth.owner(c.token);
      return c.binding;
    } catch {
      c.socket.close(1008);
      return undefined;
    }
  }
  enqueue(owner: string, command: BrowserCommand): Promise<Receipt> {
    const c = this.connections.get(owner);
    invariant(
      c &&
        c.socket.readyState === WebSocket.OPEN &&
        fingerprint(this.current(owner)) === fingerprint(command.binding),
      "disconnected",
    );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(command.actionId);
          reject(new AppError("disconnected"));
        },
        Math.max(1, command.expiresAt - Date.now()),
      );
      this.pending.set(command.actionId, {
        owner,
        connection: c.binding.connection,
        command,
        resolve,
        reject,
        timer,
      });
      c.socket.send(JSON.stringify(command), (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(command.actionId);
          reject(new AppError("disconnected"));
        }
      });
    });
  }
  close(): void {
    for (const c of this.connections.values()) c.socket.terminate();
    this.wss.close();
  }
}
