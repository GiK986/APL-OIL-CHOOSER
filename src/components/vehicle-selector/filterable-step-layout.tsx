"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface FilterableStepLayoutProps {
  content: ReactNode;
  filters?: ReactNode;
}

export function FilterableStepLayout({ content, filters }: FilterableStepLayoutProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!filters) {
    return <>{content}</>;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
      <div className="flex justify-end md:hidden">
        <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
          <SlidersHorizontal className="size-3.5" />
          {t("filtersButtonLabel")}
        </Button>
      </div>
      <div className="min-w-0 flex-1">{content}</div>
      <aside className="hidden md:block md:w-64 md:shrink-0">{filters}</aside>
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent title={t("filtersButtonLabel")} closeLabel={tc("closeLabel")}>
          {filters}
        </SheetContent>
      </Sheet>
    </div>
  );
}
