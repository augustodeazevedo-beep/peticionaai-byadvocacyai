import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkspace, type ContextItemType } from "@/stores/workspace";
import { BrandLockup } from "@/components/Logo";
import { Link } from "@tanstack/react-router";
import {
  Upload,
  Mic2,
  LinkIcon,
  Type,
  BookOpenText,
  Box,
  Layers,
  History,
  Users,
  X,
  Search,
  Construction,
} from "lucide-react";
import { toast } from "sonner";

const ICON_BY_TYPE: Record<ContextItemType, typeof Box> = {
  documento: Upload,
  modelo: Box,
  legislacao: BookOpenText,
  jurisprudencia: Search,
  web: LinkIcon,
  biblioteca_item: BookOpenText,
  bibliotecario: Users,
  prompt: Type,
  transcricao: Mic2,
  url: LinkIcon,
  texto: Type,
};

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card className="glass border-dashed border-border/50 p-12 text-center">
      <Construction className="mx-auto mb-4 h-10 w-10 text-accent" />
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

function DropZone({ icon: Icon, title, hint, actions }: { icon: typeof Box; title: string; hint: string; actions: { label: string; icon: typeof Box; onClick?: () => void }[] }) {
  return (
    <Card className="glass flex min-h-[280px] flex-col items-center justify-center gap-4 border-dashed border-border/50 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/60">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {actions.map(({ label, icon: ActionIcon, onClick }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onClick ?? (() => toast.info(`${label} estará disponível em breve.`))}
          >
            <ActionIcon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function InicioPanel() {
  const title = useWorkspace((s) => s.title);
  const setField = useWorkspace((s) => s.setField);
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-6">
        <BrandLockup size="xl" variant="stacked" glow />
        <p className="text-center text-sm text-muted-foreground">
          Construa o contexto da sua peça nas abas acima e descreva sua instrução abaixo.
        </p>
      </div>

      <Card className="glass border-border/50 p-5">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Título da minuta
        </label>
        <input
          value={title}
          onChange={(e) => setField("title", e.target.value)}
          className="w-full bg-transparent text-lg font-semibold outline-none"
          placeholder="Ex.: Ação de Cobrança — Fulano vs Beltrano"
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass border-border/50 p-5">
          <p className="mb-1 text-xs uppercase tracking-wide text-accent">Atalho</p>
          <h3 className="font-semibold">Modo formulário (atual)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Prefere o fluxo guiado por campos? Use a Nova Peça enquanto o agente novo é finalizado.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/pecas/nova">Abrir Nova Peça</Link>
          </Button>
        </Card>
        <Card className="glass border-border/50 p-5">
          <p className="mb-1 text-xs uppercase tracking-wide text-accent">Roadmap</p>
          <h3 className="font-semibold">Próximas funcionalidades</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Biblioteca, Bibliotecários, pesquisa de Legislação/Jurisprudência/Web e geração agêntica multi-step.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function HistoricoPanel() {
  return (
    <ComingSoon
      title="Histórico de minutas"
      description="Em breve: agrupamento por 'Últimos 7 dias', 'Este mês' e filtros por projeto e status. Por enquanto, veja suas peças no Dashboard."
    />
  );
}

export function DocumentosPanel() {
  return (
    <DropZone
      icon={Upload}
      title="Arraste e solte os documentos aqui"
      hint="Exemplos: íntegra do processo, petições, decisões, peças processuais etc."
      actions={[
        { label: "Arquivos", icon: Upload },
        { label: "Transcrever", icon: Mic2 },
        { label: "URL", icon: LinkIcon },
        { label: "Inserir texto", icon: Type },
        { label: "Biblioteca", icon: BookOpenText },
      ]}
    />
  );
}

export function ModelosPanel() {
  return (
    <DropZone
      icon={Box}
      title="Arraste e solte o modelo a ser seguido"
      hint="Ensine o Peticione.AI a escrever com o seu estilo. Prefira modelos em .docx para melhor preservação da formatação."
      actions={[
        { label: "Arquivos", icon: Upload },
        { label: "Inserir texto", icon: Type },
        { label: "Importar Minuta", icon: History },
        { label: "Biblioteca", icon: BookOpenText },
      ]}
    />
  );
}

export function ReferenciasPanel() {
  const items = useWorkspace((s) => s.contextItems);
  const remove = useWorkspace((s) => s.removeContextItem);

  if (items.length === 0) {
    return (
      <ComingSoon
        title="Sem referências no contexto"
        description="Adicione documentos, modelos, legislações, jurisprudência ou itens da biblioteca para que apareçam aqui."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = ICON_BY_TYPE[item.type] ?? Layers;
        return (
          <Card key={item.id} className="glass flex items-center gap-3 border-border/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/60">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.preview && <p className="truncate text-xs text-muted-foreground">{item.preview}</p>}
            </div>
            <span className="rounded bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{item.type}</span>
            <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
              <X className="h-4 w-4" />
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

export function BibliotecaPanel() {
  return (
    <ComingSoon
      title="Biblioteca pessoal"
      description="Em breve: pastas, prompts salvos, documentos, legislações e itens compartilhados, todos reutilizáveis em qualquer minuta."
    />
  );
}

export function BibliotecariosPanel() {
  return (
    <ComingSoon
      title="Bibliotecários"
      description="Em breve: agrupe vários itens da biblioteca em um 'bibliotecário' temático e ative o conjunto inteiro com um clique."
    />
  );
}