export interface RecentSearchEntry {
  typeId: number;
  categoryId: number;
  categoryName: string;
  makeName: string;
  modelName: string;
  typeName: string;
  yearStart: number;
  yearEnd: number | null;
}

const STORAGE_KEY = "apl-oil-chooser:recent-searches";
const MAX_ENTRIES = 20;

export function getRecentSearches(): RecentSearchEntry[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentSearchEntry[]).filter(
      (entry) => entry != null && typeof entry.typeId === "number",
    );
  } catch {
    return [];
  }
}

export function addRecentSearch(entry: RecentSearchEntry): RecentSearchEntry[] {
  const deduped = getRecentSearches().filter((existing) => existing.typeId !== entry.typeId);
  const next = [entry, ...deduped].slice(0, MAX_ENTRIES);

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage can throw (quota exceeded, private-browsing restrictions) —
      // recent searches are a nice-to-have, never worth breaking the flow over.
    }
  }

  return next;
}
