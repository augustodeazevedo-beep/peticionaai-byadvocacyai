/**
 * Re-exports tipados das server functions.
 * IMPORTANTE: a chamada real à API Jurisprudências.AI acontece no servidor
 * (src/lib/jurisprudencia.server.ts). Nunca chame essa API direto do browser
 * — a chave Bearer é secreta.
 */
export type { Decision, SearchResponse } from "@/lib/jurisprudencia.functions";
export {
  searchJurisprudencia,
  lookupDecision,
  listBuscasRecentes,
  clearHistoricoJurisprudencia,
  saveSelecaoJurisprudencia,
  listSelecoes,
  removeSelecao,
  getJurisprudenciaKeyStatus,
} from "@/lib/jurisprudencia.functions";