export type SelectorStep = "make" | "model" | "type" | "results";

export interface DeriveStepInput {
  hasMake: boolean;
  hasModel: boolean;
  hasType: boolean;
}

export function deriveStep({ hasMake, hasModel, hasType }: DeriveStepInput): SelectorStep {
  // A type selection (e.g. from search) always shows results, even without
  // a make/model in state — search is a direct shortcut to a typeId that
  // bypasses the drill-down entirely.
  if (hasType) return "results";
  if (!hasMake) return "make";
  if (!hasModel) return "model";
  return "type";
}
