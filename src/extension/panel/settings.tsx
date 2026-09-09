import { useState } from "react";
import {
  type ApiClient,
  errorMessage,
  type State,
} from "../../ui/api-client.js";
import { Card } from "../../ui/components.js";
import type { Inputs } from "../../shared/operation-schema.js";
export function AssetSettings({
  asset,
  api,
  onSaved,
}: {
  asset: State["assets"][number];
  api: ApiClient;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description);
  const [enabled, setEnabled] = useState(asset.enabled);
  const [defaults, setDefaults] = useState<Inputs>(asset.defaults);
  const [revision, setRevision] = useState(asset.revision);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{
    versions: {
      id: string;
      kind: string;
      dependencies: { name: string; enabled: boolean; ready: boolean }[];
    }[];
  }>();
  const load = () => {
    setName(asset.name);
    setDescription(asset.description);
    setEnabled(asset.enabled);
    setDefaults(asset.defaults);
    setRevision(asset.revision);
    setError("");
    setOpen(true);
    void api
      .call<NonNullable<typeof detail>>(`/api/assets/${asset.id}/settings`)
      .then(setDetail)
      .catch((e) => setError(errorMessage(e)));
  };
  return (
    <>
      <button
        className="secondary"
        data-testid="asset-settings-open"
        onClick={load}
      >
        개인 설정
      </button>
      {open && (
        <Card title="내 설정 편집">
          <p className="hint">
            현재 사이트에만 적용됩니다. 저장한 값은 다음 요청부터 사용하며 진행
            중인 작업은 유지해요.
          </p>
          {error && (
            <p role="alert" className="error">
              {error} 입력한 초안은 유지됩니다.
            </p>
          )}
          {revision !== asset.revision && (
            <p role="status">
              다른 변경이 저장되었습니다. 편집을 닫고 다시 열면 최신값을
              가져옵니다.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              void api
                .call(`/api/assets/${asset.id}/settings`, {
                  revision,
                  name,
                  description,
                  enabled,
                  defaults,
                })
                .then(async () => {
                  await onSaved();
                  setOpen(false);
                })
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              이름
              <input
                data-testid="asset-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              설명
              <textarea
                data-testid="asset-description"
                required
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label>
              <input
                data-testid="asset-enabled"
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              이 자산 사용
            </label>
            {(asset.inputContract ?? []).map((field) => (
              <label key={field.name}>
                {field.description || field.name} 기본값
                <input
                  data-testid={`asset-default-${field.name}`}
                  type={
                    field.type === "boolean"
                      ? "checkbox"
                      : field.type === "number"
                        ? "number"
                        : "text"
                  }
                  {...(field.type === "boolean"
                    ? { checked: defaults[field.name] === true }
                    : { value: String(defaults[field.name] ?? "") })}
                  onChange={(e) =>
                    setDefaults((old) => {
                      const next = { ...old };
                      if (field.type === "boolean")
                        next[field.name] = e.target.checked;
                      else if (e.target.value === "") delete next[field.name];
                      else
                        next[field.name] =
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value;
                      return next;
                    })
                  }
                />
              </label>
            ))}
            <button data-testid="asset-settings-save" disabled={busy}>
              설정 저장
            </button>
            <button
              type="button"
              className="secondary"
              data-testid="asset-settings-close"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </form>
          <p className="hint">
            버전{" "}
            {(detail?.versions.findIndex(
              (v) => v.id === asset.currentVersionId,
            ) ?? -1) + 1 || "검증 전"}{" "}
            ·{" "}
            {asset.kind === "basic_skill"
              ? "기본 Skill"
              : asset.kind === "personal_skill"
                ? "개인 Skill"
                : "도구"}
          </p>
          {detail?.versions
            .find((v) => v.id === asset.currentVersionId)
            ?.dependencies.map((d, i) => (
              <p className="hint" key={i}>
                의존 도구: {d.name} ·{" "}
                {d.enabled && d.ready ? "사용 가능" : "꺼짐 또는 검증 필요"}
              </p>
            ))}
        </Card>
      )}
    </>
  );
}
