import type { Repository } from "../storage/repository.js";
import { newId } from "../storage/repository.js";
import { invariant } from "../../shared/errors.js";
import type { Version } from "../../shared/asset-schema.js";
import { transaction } from "../storage/database.js";

/** A basic Skill is an explicit, reusable wrapper of an already verified Tool, not Discover output. */
export function createBasicSkill(
  repo: Repository,
  owner: string,
  assetId: string,
): Version {
  const asset = repo.asset(owner, assetId);
  invariant(asset.enabled && asset.currentVersionId, "not_observed");
  const tool = repo.version(owner, asset.currentVersionId);
  invariant(
    tool.kind === "tool" &&
      repo.reports(owner, tool.id).some((r) => r.status === "passed"),
    "not_observed",
  );
  const existing = repo
    .assets(owner)
    .filter((a) => a.siteKey === tool.siteKey)
    .flatMap((a) => repo.versions(owner, a.id))
    .find(
      (v) =>
        v.kind === "basic_skill" &&
        "steps" in v.content &&
        v.content.steps.length === 1 &&
        v.content.steps[0]?.toolVersionId === tool.id,
    );
  if (existing) return existing;
  return transaction(repo.db, () => {
    const id = newId();
    const name = `${asset.name} 실행`.slice(0, 100);
    repo.createAsset({
      id,
      owner,
      name,
      description: tool.content.description,
      defaults: {},
      enabled: true,
      revision: 0,
      siteKey: tool.siteKey,
      currentVersionId: null,
      previousVersionId: null,
    });
    const version: Version = {
      id: newId(),
      assetId: id,
      owner,
      kind: "basic_skill",
      siteKey: tool.siteKey,
      createdAt: Date.now(),
      evidence:
        "검증된 도구를 선택하여 만든 기본 Skill. 이 Skill의 독립 실행 검증 전.",
      discovery: tool.discovery,
      content: {
        name,
        description: tool.content.description,
        inputContract: tool.content.inputContract,
        steps: [
          {
            toolVersionId: tool.id,
            arguments: {},
            bindings: Object.fromEntries(
              tool.content.inputContract.map((p) => [p.name, p.name]),
            ),
          },
        ],
      },
    };
    repo.saveVersion(version);
    return version;
  });
}
