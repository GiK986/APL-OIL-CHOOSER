import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductRecommendation } from "@/lib/olyslager/types";

const FALLBACK_IMAGE = "/products/fuchs-no-image.jpg";

export function ProductCard({ product }: { product: ProductRecommendation }) {
  return (
    <Card size="sm">
      <div className="flex justify-center p-3">
        <Image
          src={product.productImage || FALLBACK_IMAGE}
          alt={product.productName}
          width={96}
          height={96}
          className="h-24 w-24 object-contain"
        />
      </div>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm font-medium">{product.productName}</p>
        {product.productCode && (
          <Badge variant="outline" className="w-fit">
            {product.productCode}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
