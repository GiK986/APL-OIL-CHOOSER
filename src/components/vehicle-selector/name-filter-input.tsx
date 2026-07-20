"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface NameFilterInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function NameFilterInput({ id, value, onChange }: NameFilterInputProps) {
  const t = useTranslations("VehiclePicker");

  return (
    <>
      <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
        {t("filterByName")}
      </label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("filterByName")}
          className={value ? "pr-8" : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("clearFilter")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
