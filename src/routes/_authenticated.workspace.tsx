import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspaceTabs, type WorkspaceTabKey } from "@/components/workspace/WorkspaceTabs";
import { ContextComposer } from "@/components/workspace/ContextComposer";
import { UsagePanel } from "@/components/workspace/UsagePanel";
import {
  InicioPanel,
  HistoricoPanel,
  DocumentosPanel,
  ModelosPanel,
  ReferenciasPanel,
  BibliotecaPanel,
  BibliotecariosPanel,
} from "@/components/workspace/TabPanels";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [{ title: "Workspace — Peticiona.AI" }] }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const [tab, setTab] = useState<WorkspaceTabKey>("inicio");

  return (
    <div className="mx-auto max-w-7xl pb-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <WorkspaceTabs active={tab} onChange={setTab} />

          <section className="min-h-[420px]">
            {tab === "inicio" && <InicioPanel />}
            {tab === "historico" && <HistoricoPanel />}
            {tab === "documentos" && <DocumentosPanel />}
            {tab === "modelos" && <ModelosPanel />}
            {tab === "referencias" && <ReferenciasPanel />}
            {tab === "biblioteca" && <BibliotecaPanel />}
            {tab === "bibliotecarios" && <BibliotecariosPanel />}
          </section>

          <div className="sticky bottom-4 z-30">
            <ContextComposer />
          </div>
        </div>
        <aside className="hidden lg:block">
          <UsagePanel />
        </aside>
      </div>
    </div>
  );
}