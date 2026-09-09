import { Catalog, type CatalogItem } from "./catalog.js";
import { Detail } from "./detail.js";
import { useState, useEffect } from "react";
import { ApiClient, errorMessage } from "../ui/api-client.js";
import { Card, Empty } from "../ui/components.js";
const api = new ApiClient(location.origin);
export function Store() {
  const [credential, setCredential] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState("");
  const refresh = () =>
    api.call<{ items: typeof items }>("/api/catalog").then((r) => {
      setItems(r.items);
      setAuthenticated(true);
    });
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);
  return (
    <main className="shell wide">
      <header className="store-heading">
        <div className="brand">
          <div className="brandmark">❧</div>
          <div>
            <div className="eyebrow">VIBE ZOO</div>
            <h1>Skill Store</h1>
          </div>
        </div>
        <span className="tag">TEAM DEMO</span>
      </header>
      <section className="store-hero">
        <div className="eyebrow">LEARN ONCE, SHARE TOGETHER</div>
        <h2>
          나의 작은 배움이
          <br />
          팀의 도구가 됩니다.
        </h2>
        <p>동료가 검증한 도구와 Skill을 둘러보고, 내 환경에서 확인해보세요.</p>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!authenticated ? (
        <Card title="팀 Store에 들어가기">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              void api
                .call("/api/session", { credential })
                .then(() => {
                  setCredential("");
                  return refresh();
                })
                .catch((e) => setError(errorMessage(e)));
            }}
          >
            <label htmlFor="store-code">데모 접근 코드</label>
            <input
              id="store-code"
              type="password"
              data-testid="store-code"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
            />
            <button data-testid="store-login">Store 열기</button>
          </form>
        </Card>
      ) : (
        <>
          <div className="row">
            <h2>함께 쓰는 자산</h2>
            <span className="hint">{items.length}개 게시됨</span>
          </div>
          <Catalog items={items} onSelect={(item) => setSelected(item.id)} />
          {items.find((item) => item.id === selected) && (
            <Detail
              key={selected}
              item={items.find((item) => item.id === selected)!}
              api={api}
              onRefresh={refresh}
            />
          )}
          {!items.length && (
            <Card title="아직 공유된 자산이 없어요">
              <Empty>
                Keeper에서 도구와 Skill을 검증한 뒤 공유할 자산을 선택해주세요.
                개인 자산은 자동으로 게시되지 않습니다.
              </Empty>
            </Card>
          )}
        </>
      )}
      <footer className="footer">
        공유된 자산도 설치자의 로그인 탭에서 다시 검증합니다.
      </footer>
    </main>
  );
}
