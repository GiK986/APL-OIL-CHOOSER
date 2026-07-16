import type { ProductInterval, ProductRecommendation } from "@/lib/olyslager/types";

export interface ProductUseGroup {
  useName: string;
  useAppOrder: number;
  intervals: ProductInterval[];
  products: ProductRecommendation[];
}

export function groupProductsByUse(products: ProductRecommendation[]): ProductUseGroup[] {
  const groups = new Map<string, ProductUseGroup>();

  for (const product of products) {
    const useName = product.useName ?? "Normal";
    const existing = groups.get(useName);
    if (existing) {
      existing.products.push(product);
    } else {
      groups.set(useName, {
        useName,
        useAppOrder: product.useAppOrder,
        intervals: product.intervals,
        products: [product],
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.useAppOrder - b.useAppOrder);
}
