import { z } from "zod";
import { inputsSchema } from "../../shared/operation-schema.js";
import { assertSafeData } from "../../shared/redaction.js";
import { invariant } from "../../shared/errors.js";
import { Repository } from "../storage/repository.js";
import { inputSchema } from "../mcp/server.js";
export const settingsSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(600),
  defaults: inputsSchema,
  enabled: z.boolean(),
});
export class Settings {
  constructor(private repo: Repository) {}
  save(owner: string, id: string, raw: unknown) {
    const edit = settingsSchema.parse(raw);
    assertSafeData(edit);
    const asset = this.repo.asset(owner, id);
    const version = asset.currentVersionId
      ? this.repo.version(owner, asset.currentVersionId)
      : this.repo.versions(owner, id).at(-1);
    invariant(version, "not_found");
    inputSchema(version.content).partial().parse(edit.defaults);
    return this.repo.editAsset(owner, id, edit.revision, (a) => ({
      ...a,
      name: edit.name,
      description: edit.description,
      defaults: edit.defaults,
      enabled: edit.enabled,
    }));
  }
  detail(owner: string, id: string) {
    const asset = this.repo.asset(owner, id);
    return {
      asset,
      versions: this.repo.versions(owner, id).map((v) => ({
        id: v.id,
        kind: v.kind,
        createdAt: v.createdAt,
        inputContract: v.content.inputContract,
        dependencies:
          "steps" in v.content
            ? v.content.steps.map((step) => {
                const dep = this.repo.version(owner, step.toolVersionId);
                const a = this.repo.asset(owner, dep.assetId);
                return {
                  versionId: dep.id,
                  name: a.name,
                  enabled: a.enabled,
                  ready: this.repo
                    .reports(owner, dep.id)
                    .some((r) => r.status === "passed"),
                };
              })
            : [],
        reports: this.repo
          .reports(owner, v.id)
          .map((r) => ({
            status: r.status,
            caseKind: r.caseKind,
            createdAt: r.createdAt,
          })),
      })),
    };
  }
}
