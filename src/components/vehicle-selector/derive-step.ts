export type SelectorStep = "category" | "make" | "model" | "type";

export interface DeriveStepInput {
  hasCategory: boolean;
  hasMake: boolean;
  hasModel: boolean;
  showCategoryGrid: boolean;
}

export function deriveStep({
  hasCategory,
  hasMake,
  hasModel,
  showCategoryGrid,
}: DeriveStepInput): SelectorStep {
  if (showCategoryGrid || !hasCategory) return "category";
  if (!hasMake) return "make";
  if (!hasModel) return "model";
  return "type";
}
