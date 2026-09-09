import type { Snapshot } from "../../shared/contracts.js";
import type { Version } from "../../shared/asset-schema.js";
import { Repository } from "../storage/repository.js";
import { invariant } from "../../shared/errors.js";
export class Registry {
  constructor(private repo: Repository) {}
  select(owner: string, siteKey: string): Snapshot[] {
    return this.repo
      .assets(owner)
      .filter((a) => a.enabled && a.siteKey === siteKey && a.currentVersionId)
      .filter((a) => {
        const v = this.repo.version(owner, a.currentVersionId!);
        return (
          !("steps" in v.content) ||
          v.content.steps.every((step) => {
            const dependency = this.repo.version(owner, step.toolVersionId);
            return (
              this.repo.asset(owner, dependency.assetId).enabled &&
              this.repo
                .reports(owner, dependency.id)
                .some((r) => r.status === "passed")
            );
          })
        );
      })
      .map((a) => ({
        assetId: a.id,
        versionId: a.currentVersionId!,
        settingsRevision: a.revision,
        name: a.name,
        description: a.description,
        defaults: a.defaults,
      }));
  }
  resolve(owner: string, snapshots: Snapshot[]): Version[] {
    return snapshots.map((s) => {
      const v = this.repo.version(owner, s.versionId);
      invariant(v.assetId === s.assetId);
      return v;
    });
  }
}
