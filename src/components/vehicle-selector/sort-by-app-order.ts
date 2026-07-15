export function sortByAppOrder<T extends { appOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.appOrder - b.appOrder);
}
