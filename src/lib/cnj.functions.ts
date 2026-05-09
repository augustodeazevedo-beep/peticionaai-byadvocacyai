import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CNJ_RE = /^(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})$/;

const TRIBUNAIS: Record<string, string[]> = {
  // segmento (j) -> lista de aliases datajud
  "1": ["stf"],
  "2": ["cnj"],
  "3": ["stj"],
  "4": ["trf1", "trf2", "trf3", "trf4", "trf5", "trf6"],
  "5": [
    "trt1","trt2","trt3","trt4","trt5","trt6","trt7","trt8","trt9","trt10",
    "trt11","trt12","trt13","trt14","trt15","trt16","trt17","trt18","trt19","trt20",
    "trt21","trt22","trt23","trt24","tst",
  ],
  "6": ["tse"],
  "7": ["stm"],
  "8": [
    "tjac","tjal","tjap","tjam","tjba","tjce","tjdft","tjes","tjgo","tjma","tjmt",
    "tjms","tjmg","tjpa","tjpb","tjpr","tjpe","tjpi","tjrj","tjrn","tjrs","tjro",
    "tjrr","tjsc","tjsp","tjse","tjto",
  ],
  "9": ["tjmmg","tjmrs","tjmsp"],
};

export const lookupCnjMetadata = createServerFn({ method: "POST" })
  .inputValidator(z.object({ numero: z.string().min(15).max(30) }).parse)
  .handler(async ({ data }) => {
    const clean = data.numero.replace(/\D/g, "");
    if (clean.length !== 20) {
      return { ok: false as const, error: "Número CNJ deve ter 20 dígitos." };
    }
    const j = clean[13];
    const candidates = TRIBUNAIS[j] ?? [];
    if (candidates.length === 0) {
      return { ok: false as const, error: "Segmento de tribunal não suportado." };
    }
    const formatted = `${clean.slice(0,7)}-${clean.slice(7,9)}.${clean.slice(9,13)}.${clean.slice(13,14)}.${clean.slice(14,16)}.${clean.slice(16,20)}`;
    const body = JSON.stringify({ query: { match: { numeroProcesso: formatted } } });

    for (const trib of candidates) {
      try {
        const res = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${trib}/_search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==" },
          body,
        });
        if (!res.ok) continue;
        const json: any = await res.json();
        const hit = json?.hits?.hits?.[0]?._source;
        if (hit) {
          return {
            ok: true as const,
            tribunal: trib.toUpperCase(),
            numero: formatted,
            classe: hit.classe?.nome ?? null,
            assuntos: (hit.assuntos ?? []).map((a: any) => a.nome).filter(Boolean),
            orgaoJulgador: hit.orgaoJulgador?.nome ?? null,
            dataAjuizamento: hit.dataAjuizamento ?? null,
            grau: hit.grau ?? null,
            sistema: hit.sistema?.nome ?? null,
            movimentos: (hit.movimentos ?? []).slice(0, 20).map((m: any) => ({
              data: m.dataHora,
              nome: m.nome,
              codigo: m.codigo,
            })),
          };
        }
      } catch (e) {
        // try next
      }
    }
    return { ok: false as const, error: "Processo não localizado nos tribunais consultados." };
  });