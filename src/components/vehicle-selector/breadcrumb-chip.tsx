"use client";

import Image from "next/image";
import { X, type LucideIcon } from "lucide-react";

interface BreadcrumbChipProps {
  label: string;
  onClear: () => void;
  icon?: LucideIcon;
  imageUrl?: string | null;
}

export function BreadcrumbChip({ label, onClear, icon: Icon, imageUrl }: BreadcrumbChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-1.5 text-sm">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
      ) : Icon ? (
        <Icon className="size-4 text-primary" />
      ) : null}
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
