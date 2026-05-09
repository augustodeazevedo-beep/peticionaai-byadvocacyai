import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  numeroOab: z.string().min(2).max(15).optional(),
  ufOab: z.string().length(2).optional(),
  nomeParte: z.string().min(3).max(120).optional(),
  dataInicio: z.string().optional(), // YYYY-MM-DD
  dataFim: z.string().optional(),
  pagina: z.number().int().min(1).max(50).default(1),
});

export const searchDjenCommunications = createServerFn({ method: "POST" })
  .inputValidator(Schema.parse)
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.numeroOab) params.set("numeroOab", data.numeroOab);
    if (data.ufOab) params.set("ufOab", data.ufOab.toUpperCase());
    if (data.nomeParte) params.set("nomeParte", data.nomeParte);
    if (data.dataInicio) params.set("dataDisponibilizacaoInicio", data.dataInicio);
    if (data.dataFim) params.set("dataDisponibilizacaoFim", data.dataFim);
    params.set("pagina", String(data.pagina));
    params.set("itensPorPagina", "30");

    try {
      const res = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) {
        return { ok: false as const, error: `DJEN respondeu ${res.status}`, items: [] as any[] };
      }
      const json: any = await res.json();
      const items = (json?.items ?? json?.dados ?? []).map((c: any) => ({
        id: c.id ?? c.hash ?? `${c.numeroProcessoComMascara}-${c.dataDisponibilizacao}`,
        numeroProcesso: c.numeroProcessoComMascara ?? c.numero_processo ?? null,
        tribunal: c.siglaTribunal ?? c.nomeOrgao ?? null,
        tipoComunicacao: c.tipoComunicacao ?? c.tipoDocumento ?? null,
        dataDisponibilizacao: c.dataDisponibilizacao ?? null,
        texto: c.texto ?? c.textoCategoria ?? "",
        link: c.link ?? null,
      }));
      return { ok: true as const, items, total: json?.count ?? items.length };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Falha ao consultar DJEN", items: [] as any[] };
    }
  });