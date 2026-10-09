import { useTranslations } from "next-intl";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ProductUseSection } from "./product-use-section";
import { groupProductsByUse } from "./group-products-by-use";
import type { Capacity, RecommendationComponent } from "@/lib/olyslager/types";
import type { Brand } from "@/lib/olyslager/brand";

function formatCapacitiesSummary(capacities: Capacity[]): string {
  return capacities
    .map((capacity) => {
      const condition = capacity.condition ? ` (${capacity.condition})` : "";
      return `${capacity.item} ${capacity.value} ${capacity.unit}${condition}`;
    })
    .join(" | ");
}

export function ComponentAccordion({ component, brand }: { component: RecommendationComponent; brand: Brand }) {
  const t = useTranslations("Results");
  const hasContent = component.productRecommendations.length > 0 || component.capacities.length > 0;
  const capacitiesSummary = formatCapacitiesSummary(component.capacities);
  const groups = groupProductsByUse(component.productRecommendations);

  return (
    <AccordionItem value={component.id}>
      <AccordionTrigger>
        <span className="flex flex-col items-start gap-1">
          <span className="uppercase">
            {component.componentName}
            {component.componentCode && (
              <span className="text-muted-foreground"> | {component.componentCode}</span>
            )}
          </span>
          {capacitiesSummary && (
            <span className="text-sm font-normal normal-case text-muted-foreground">
              {t("capacitySpecLabel")}: {capacitiesSummary}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {hasContent ? (
          groups.map((group) => <ProductUseSection key={group.useName} group={group} brand={brand} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("noComponents")}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
