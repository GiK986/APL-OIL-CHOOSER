"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ENABLED_BRANDS, type Brand } from "@/lib/olyslager/brand";

// Brand names are proper nouns — deliberately not translated.
const BRAND_LABELS: Record<Brand, string> = {
  fuchs: "Fuchs",
  eurol: "Eurol",
};

interface BrandSwitchProps {
  value: Brand;
  onChange: (brand: Brand) => void;
}

export function BrandSwitch({ value, onChange }: BrandSwitchProps) {
  const t = useTranslations("Results");

  return (
    <div className="flex items-center gap-2">
      <span id="brand-switch-label" className="text-sm text-muted-foreground">
        {t("brandSwitchLabel")}
      </span>
      <div
        role="group"
        aria-labelledby="brand-switch-label"
        className="inline-flex gap-1 rounded-lg border border-border p-1"
      >
        {ENABLED_BRANDS.map((brand) => {
          const active = brand === value;
          return (
            <Button
              key={brand}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              aria-pressed={active}
              onClick={() => {
                if (!active) onChange(brand);
              }}
            >
              {BRAND_LABELS[brand]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
