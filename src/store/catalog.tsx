import type { Publication, Installation } from "../shared/publication.js";
import { Card } from "../ui/components.js";
export type CatalogItem = Publication & { installation?: Installation };
export function Catalog({
  items,
  onSelect,
}: {
  items: CatalogItem[];
  onSelect: (item: CatalogItem) => void;
}) {
  return (
    <div className="grid">
      {items.map((item) => (
        <Card key={item.id} title={item.name}>
          <p>{item.description}</p>
          <p className="hint">
            {item.author} · {item.scope}
          </p>
          <button data-testid="catalog-detail" onClick={() => onSelect(item)}>
            상세 보기{item.installation ? " · 내 영역에 설치됨" : ""}
          </button>
        </Card>
      ))}
    </div>
  );
}
