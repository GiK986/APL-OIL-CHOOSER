import type { ReactNode } from "react";

interface FilterableStepLayoutProps {
  content: ReactNode;
  filters?: ReactNode;
}

export function FilterableStepLayout({ content, filters }: FilterableStepLayoutProps) {
  if (!filters) {
    return <>{content}</>;
  }
  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">{content}</div>
      <aside className="w-64 shrink-0">{filters}</aside>
    </div>
  );
}
