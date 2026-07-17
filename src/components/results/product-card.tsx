"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductRecommendation } from "@/lib/olyslager/types";

const FALLBACK_IMAGE = "/products/fuchs-no-image.jpg";

// Local product photos are named after productCode (e.g. "/products/CP1003290.jpg").
// productImage from the API is always empty in this dataset today, but takes
// priority if a future dataset populates it. If neither exists — or the guessed
// local file 404s — onError below swaps to the Fuchs placeholder.
function initialImageSrc(product: ProductRecommendation): string {
  if (product.productImage) return product.productImage;
  if (product.productCode) return `/products/${product.productCode}.jpg`;
  return FALLBACK_IMAGE;
}

export function ProductCard({ product }: { product: ProductRecommendation }) {
  const [src, setSrc] = useState(() => initialImageSrc(product));

  return (
    <Card size="sm" className="border border-border">
      <div className="relative flex justify-center p-3">
        {product.productCode && (
          <Badge variant="outline" className="absolute top-2 left-2 bg-card">
            {product.productCode}
          </Badge>
        )}
        <Image
          src={src}
          alt={product.productName}
          width={120}
          height={200}
          className="h-48 w-auto object-contain"
          onError={() => setSrc(FALLBACK_IMAGE)}
        />
      </div>
      <CardContent>
        <p className="text-sm font-medium">{product.productName}</p>
      </CardContent>
    </Card>
  );
}
