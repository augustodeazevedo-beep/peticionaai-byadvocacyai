import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPieces from "./tools/list_pieces";
import getPiece from "./tools/get_piece";
import searchPieces from "./tools/search_pieces";
import listTemplates from "./tools/list_templates";
import whoami from "./tools/whoami";

// Direct Supabase issuer — mcp-js validates the token against the discovery
// document, and the .lovable.cloud proxy publishes the direct supabase.co
// form. VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "peticiona-ai-mcp",
  title: "Peticiona.AI",
  version: "0.1.0",
  instructions:
    "Ferramentas para acessar as peças jurídicas e modelos do usuário autenticado no Peticiona.AI. Use `whoami` para verificar a conexão, `list_pieces` / `search_pieces` / `get_piece` para consultar peças e `list_templates` para modelos. Todas as chamadas respeitam RLS — o usuário vê apenas dados próprios.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listPieces, searchPieces, getPiece, listTemplates],
});