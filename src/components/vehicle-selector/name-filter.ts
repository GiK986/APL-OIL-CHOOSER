export function matchesNameFilter(name: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return name.toLowerCase().includes(trimmed);
}
