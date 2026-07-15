import type { RecommendationComponent } from "@/lib/olyslager/types";

export function extractUseNames(components: RecommendationComponent[]): string[] {
  const values = new Set<string>();
  for (const component of components) {
    for (const product of component.productRecommendations) {
      if (product.useName) values.add(product.useName);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function filterComponentsByUseName(
  components: RecommendationComponent[],
  useName: string | null,
): RecommendationComponent[] {
  if (!useName) return components;
  return components.map((component) => ({
    ...component,
    productRecommendations: component.productRecommendations.filter(
      (product) => product.useName === useName,
    ),
  }));
}
