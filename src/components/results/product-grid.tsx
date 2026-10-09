import { ProductCard } from "./product-card";
import type { Brand } from "@/lib/olyslager/brand";
import type { ProductRecommendation } from "@/lib/olyslager/types";

export function ProductGrid({ products, brand }: { products: ProductRecommendation[]; brand: Brand }) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <ProductCard
          key={`${product.productCode ?? product.productName}-${index}`}
          product={product}
          brand={brand}
        />
      ))}
    </div>
  );
}
