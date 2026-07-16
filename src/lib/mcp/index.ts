import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPieces from "./tools/list_pieces";
import getPiece from "./tools/get_piece";
import searchPieces from "./tools/search_pieces";
import listTemplates from "./tools/list_templates";
import whoami from "./tools/whoami";
import createPiece from "./tools/create_piece";
import updatePiece from "./tools/update_piece";
import createTemplate from "./tools/create_template";
import updateTemplate from "./tools/update_template";
import auditText from "./tools/audit_text";
import auditPiece from "./tools/audit_piece";

// Direct Supabase issuer — mcp-js validates the token against the discovery
// document, and the .lovable.cloud proxy publishes the direct supabase.co
// form. VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "peticiona-ai-mcp",
  title: "Peticiona.AI",
  version: "0.1.0",
  instructions:
    "Ferramentas para gerenciar peças jurídicas e modelos do usuário autenticado no Peticiona.AI. Consulta: `whoami`, `list_pieces`, `search_pieces`, `get_piece`, `list_templates`. Escrita: `create_piece` e `update_piece` (peças, anexos e metadados do caso); `create_template` e `update_template` (modelos com persona, regras e placeholders). Auditoria Detect.AI: `audit_text` (auditar texto arbitrário sem persistir) e `audit_piece` (auditar uma peça e salvar o resultado). Cada achado inclui severidade, trecho e correção sugerida. Todas as chamadas respeitam RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listPieces,
    searchPieces,
    getPiece,
    listTemplates,
    createPiece,
    updatePiece,
    createTemplate,
    updateTemplate,
    auditText,
    auditPiece,
  ],
});