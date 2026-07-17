"use client";

import { useTranslations } from "next-intl";
import type { RecentSearchEntry } from "@/lib/recent-searches";

interface RecentSearchesListProps {
  entries: RecentSearchEntry[];
  onSelect: (entry: RecentSearchEntry) => void;
}

export function RecentSearchesList({ entries, onSelect }: RecentSearchesListProps) {
  const t = useTranslations("VehiclePicker");

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{t("recentSearchesLabel")}</p>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li
            key={entry.typeId}
            className="not-last:border-b not-last:border-border not-last:pb-2"
          >
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="w-full rounded-[3px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            >
              <span className="block font-medium">
                {entry.makeName} {entry.modelName}
              </span>
              <span className="block text-muted-foreground">{entry.typeName}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
