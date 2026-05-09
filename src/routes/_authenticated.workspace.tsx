import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorkspaceTabs, type WorkspaceTabKey } from "@/components/workspace/WorkspaceTabs";
import { ContextComposer } from "@/components/workspace/ContextComposer";
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
  head: () => ({ meta: [{ title: "Workspace — Peticione.AI" }] }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const [tab, setTab] = useState<WorkspaceTabKey>("inicio");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
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
  );
}