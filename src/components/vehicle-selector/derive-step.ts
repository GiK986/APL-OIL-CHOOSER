export type SelectorStep = "category" | "make" | "model" | "type" | "results";

export interface DeriveStepInput {
  hasCategory: boolean;
  hasMake: boolean;
  hasModel: boolean;
  hasType: boolean;
  showCategoryGrid: boolean;
}

export function deriveStep({
  hasCategory,
  hasMake,
  hasModel,
  hasType,
  showCategoryGrid,
}: DeriveStepInput): SelectorStep {
  // A type selection (e.g. from search) always shows results, even without
  // a category/make/model in state — search is a direct shortcut to a typeId
  // that bypasses the drill-down entirely.
  if (hasType) return "results";
  if (showCategoryGrid || !hasCategory) return "category";
  if (!hasMake) return "make";
  if (!hasModel) return "model";
  return "type";
}
