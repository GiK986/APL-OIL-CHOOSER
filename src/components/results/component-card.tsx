import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductRecommendationTable } from "./product-recommendation-table";
import { CapacitiesList } from "./capacities-list";
import type { RecommendationComponent } from "@/lib/olyslager/types";

export function ComponentCard({ component }: { component: RecommendationComponent }) {
  const t = useTranslations("Results");
  const hasContent =
    component.productRecommendations.length > 0 || component.capacities.length > 0;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {component.componentName}
          {component.componentCode && (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {component.componentCode}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasContent ? (
          <>
            <ProductRecommendationTable products={component.productRecommendations} />
            <CapacitiesList capacities={component.capacities} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noComponents")}</p>
        )}
      </CardContent>
    </Card>
  );
}
