import type { Brand } from "@/lib/olyslager/brand";
import type { ProductRecommendation } from "@/lib/olyslager/types";

const FALLBACK_IMAGES: Record<Brand, string> = {
  fuchs: "/products/fuchs-no-image.jpg",
  eurol: "/products/eurol-no-image.png",
};

export function getFallbackImage(brand: Brand): string {
  return FALLBACK_IMAGES[brand];
}

// Local product photos are named after productCode (e.g. "/products/CP1003290.jpg").
// productImage from the API is empty (Fuchs) or absent (Eurol) today, but takes
// priority if a dataset ever populates it. If neither exists — or the guessed
// local file 404s, which ProductCard handles via onError — the selected brand's
// placeholder is shown.
export function initialImageSrc(
  product: Pick<ProductRecommendation, "productImage" | "productCode">,
  brand: Brand,
): string {
  if (product.productImage) return product.productImage;
  if (product.productCode) return `/products/${product.productCode}.jpg`;
  return getFallbackImage(brand);
}
