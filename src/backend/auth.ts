import { randomBytes, createHash } from "node:crypto";
import type { Repository } from "./storage/repository.js";
import { AppError } from "../shared/errors.js";
const hash = (s: string): string =>
  createHash("sha256").update(s).digest("hex");
export class Auth {
  constructor(private repo: Repository) {}
  issue(credential: string): string {
    if (credential.length < 24 || credential.length > 512)
      throw new AppError("unauthorized", 401);
    const actor = this.repo.db
      .prepare("SELECT id FROM actors WHERE credential_hash=?")
      .get(hash(credential));
    if (!actor) throw new AppError("unauthorized", 401);
    const token = randomBytes(32).toString("base64url");
    this.repo.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(hash(token), String(actor.id), Date.now() + 12 * 60 * 60 * 1000);
    return token;
  }
  owner(token: string | undefined): string {
    if (!token || token.length > 512) throw new AppError("unauthorized", 401);
    const s = this.repo.db
      .prepare("SELECT owner FROM sessions WHERE hash=? AND expires_at>?")
      .get(hash(token), Date.now());
    if (!s) throw new AppError("unauthorized", 401);
    return String(s.owner);
  }
  revoke(token: string): void {
    this.repo.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));
  }
  static credentialHash = hash;
}
