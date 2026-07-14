import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProductRecommendation } from "@/lib/olyslager/types";

export function ProductRecommendationTable({
  products,
}: {
  products: ProductRecommendation[];
}) {
  const t = useTranslations("Results");

  if (products.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("recommendedProducts")}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("productColumn")}</TableHead>
            <TableHead>{t("codeColumn")}</TableHead>
            <TableHead>{t("useColumn")}</TableHead>
            <TableHead>{t("changeInterval")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <TableRow key={`${product.productCode ?? product.productName}-${index}`}>
              <TableCell className="font-medium">{product.productName}</TableCell>
              <TableCell>
                {product.productCode && <Badge variant="outline">{product.productCode}</Badge>}
              </TableCell>
              <TableCell>{product.useName ?? "—"}</TableCell>
              <TableCell>
                {product.intervals.map((interval, i) => (
                  <div key={i}>
                    <Badge variant="secondary" className="mr-1">
                      {interval.intervalType}
                    </Badge>
                    {interval.intervalName}
                  </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
