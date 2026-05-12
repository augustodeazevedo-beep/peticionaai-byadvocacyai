import type { ReactNode } from "react";

export function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">{left}</div>
      <aside role="complementary" aria-label="Configurações Visual Law AI" className="min-w-0">
        {right}
      </aside>
    </div>
  );
}