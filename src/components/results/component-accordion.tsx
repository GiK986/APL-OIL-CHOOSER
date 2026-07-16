import { useTranslations } from "next-intl";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ProductUseSection } from "./product-use-section";
import { groupProductsByUse } from "./group-products-by-use";
import type { Capacity, RecommendationComponent } from "@/lib/olyslager/types";

function formatCapacitiesSummary(capacities: Capacity[]): string {
  return capacities
    .map((capacity) => {
      const condition = capacity.condition ? ` (${capacity.condition})` : "";
      return `${capacity.item} ${capacity.value} ${capacity.unit}${condition}`;
    })
    .join(" | ");
}

export function ComponentAccordion({ component }: { component: RecommendationComponent }) {
  const t = useTranslations("Results");
  const hasContent = component.productRecommendations.length > 0 || component.capacities.length > 0;
  const capacitiesSummary = formatCapacitiesSummary(component.capacities);
  const groups = groupProductsByUse(component.productRecommendations);

  return (
    <AccordionItem value={component.id}>
      <AccordionTrigger>
        <span className="flex flex-col items-start gap-1">
          <span className="flex items-center gap-2">
            {component.componentName}
            {component.componentCode && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {component.componentCode}
              </Badge>
            )}
          </span>
          {capacitiesSummary && (
            <span className="text-xs font-normal text-muted-foreground">{capacitiesSummary}</span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {hasContent ? (
          groups.map((group) => <ProductUseSection key={group.useName} group={group} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("noComponents")}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
