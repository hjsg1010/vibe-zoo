import { useState } from "react";
import type { Publication } from "../shared/publication.js";
import { type ApiClient, errorMessage, type State } from "../ui/api-client.js";
export function Publish({
  asset,
  api,
}: {
  asset: State["assets"][number];
  api: ApiClient;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description);
  const [author, setAuthor] = useState("Vibe Zoo 팀");
  const [preview, setPreview] = useState<{
    publication: Omit<Publication, "id" | "createdAt">;
    digest: string;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const request = {
    versionId: asset.currentVersionId,
    revision: asset.revision,
    name,
    description,
    author,
  };
  if (!asset.currentVersionId) return null;
  return (
    <div>
      <button
        className="secondary"
        data-testid="publish-open"
        onClick={() => setOpen(!open)}
      >
        Store에 공유
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            void api
              .call<NonNullable<typeof preview>>(
                `/api/assets/${asset.id}/publication-preview`,
                request,
              )
              .then(setPreview)
              .catch((e) => setError(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        >
          <p>
            현재 선택한 검증 버전과 고정 의존성을 공유합니다. 개인
            기본값·대화·시연·로그인은 포함하지 않아요.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <label>
            공개 이름
            <input
              data-testid="publish-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            공개 설명
            <textarea
              data-testid="publish-description"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            작성자 표시
            <input
              data-testid="publish-author"
              required
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          <button data-testid="publish-preview" disabled={busy || done}>
            공개 내용 확인
          </button>
          {preview && (
            <section>
              <h3>{preview.publication.name}</h3>
              <p>{preview.publication.description}</p>
              <p>
                {preview.publication.scope} · {preview.publication.author}
              </p>
              <p>
                {preview.publication.versions.length}개 고정 자산 ·{" "}
                {preview.publication.validation}
              </p>
              <p>{preview.publication.limitations}</p>
              <button
                type="button"
                data-testid="publish-confirm"
                disabled={busy || done}
                onClick={() => {
                  setBusy(true);
                  void api
                    .call(`/api/assets/${asset.id}/publish`, {
                      ...request,
                      previewDigest: preview.digest,
                    })
                    .then(() => setDone(true))
                    .catch((e) => setError(errorMessage(e)))
                    .finally(() => setBusy(false));
                }}
              >
                이 버전 게시
              </button>
            </section>
          )}
          {done && <p role="status">선택한 버전을 Store에 게시했습니다.</p>}
        </form>
      )}
    </div>
  );
}
