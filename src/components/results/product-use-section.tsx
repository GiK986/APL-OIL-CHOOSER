import { useTranslations } from "next-intl";
import { ProductGrid } from "./product-grid";
import type { ProductUseGroup } from "./group-products-by-use";

export function ProductUseSection({ group }: { group: ProductUseGroup }) {
  const t = useTranslations("Results");
  const intervalsSummary = group.intervals
    .map((interval) => `${interval.intervalType} ${interval.intervalName}`)
    .join(" | ");

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-sm font-semibold">{group.useName}</p>
      {intervalsSummary && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t("changeInterval")}: {intervalsSummary}
        </p>
      )}
      <ProductGrid products={group.products} />
    </div>
  );
}
