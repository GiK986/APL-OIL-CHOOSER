"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsEmbedded } from "@/hooks/use-is-embedded";
import { openArticleList } from "@/lib/tm1";
import { cn } from "@/lib/utils";
import type { ProductRecommendation } from "@/lib/olyslager/types";
import type { Brand } from "@/lib/olyslager/brand";
import { getFallbackImage, initialImageSrc } from "./product-image";

export function ProductCard({ product, brand }: { product: ProductRecommendation; brand: Brand }) {
  const [src, setSrc] = useState(() => initialImageSrc(product, brand));
  const isEmbedded = useIsEmbedded();
  const { productCode } = product;

  const card = (
    <Card
      size="sm"
      className={cn("border border-border", isEmbedded && productCode && "transition-colors hover:border-primary")}
    >
      <div className="relative flex justify-center p-3">
        {productCode && (
          <Badge variant="outline" className="absolute top-2 left-2 bg-card">
            {productCode}
          </Badge>
        )}
        <Image
          src={src}
          alt={product.productName}
          width={120}
          height={200}
          className="h-48 w-auto object-contain"
          onError={() => setSrc(getFallbackImage(brand))}
        />
      </div>
      <CardContent>
        {/* Fixed to exactly 2 lines so every card reserves the same space
            regardless of name length — CSS grid only equalizes heights
            within a row, so a short name in its own row (no taller sibling
            to stretch against) would otherwise end up visibly shorter. */}
        <p className="line-clamp-2 h-10 text-sm font-medium">{product.productName}</p>
      </CardContent>
    </Card>
  );

  // TM1/Next Catalogue embeds this app in an iframe and listens for this
  // postMessage to open its own article-list modal — meaningless (and not
  // clickable) outside that embed.
  if (isEmbedded && productCode) {
    return (
      <button type="button" className="w-full text-left" onClick={() => openArticleList(productCode, brand)}>
        {card}
      </button>
    );
  }

  return card;
}
