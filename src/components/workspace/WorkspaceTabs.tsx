import { Home, History, FolderOpen, Box, Layers, BookOpenText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTabKey =
  | "inicio"
  | "historico"
  | "documentos"
  | "modelos"
  | "referencias"
  | "biblioteca"
  | "bibliotecarios";

const TABS: { key: WorkspaceTabKey; label: string; Icon: typeof Home }[] = [
  { key: "inicio", label: "Início", Icon: Home },
  { key: "historico", label: "Histórico", Icon: History },
  { key: "documentos", label: "Documentos", Icon: FolderOpen },
  { key: "modelos", label: "Modelos", Icon: Box },
  { key: "referencias", label: "Referências", Icon: Layers },
  { key: "biblioteca", label: "Biblioteca", Icon: BookOpenText },
  { key: "bibliotecarios", label: "Bibliotecários", Icon: Users },
];

type Props = {
  active: WorkspaceTabKey;
  onChange: (k: WorkspaceTabKey) => void;
};

export function WorkspaceTabs({ active, onChange }: Props) {
  return (
    <div className="flex w-full justify-center overflow-x-auto pb-2">
      <div className="flex gap-2">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex w-[88px] flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition shrink-0",
                isActive
                  ? "border-transparent bg-gradient-brand text-primary-foreground shadow-[0_0_24px_-8px_var(--brand-cyan)]"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}