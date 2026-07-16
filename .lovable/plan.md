# Detect.AI como ferramenta MCP

Adicionar uma nova ferramenta MCP `audit_text` (e, opcionalmente, `audit_piece`) para que assistentes externos conectados via MCP possam rodar o pipeline Detect.AI em textos arbitrários, recebendo achados com severidade, trecho e correção sugerida.

## Arquivos

**Novo — `src/lib/mcp/tools/audit_text.ts`**
- `defineTool` com:
  - `name: "audit_text"`, `title: "Detect.AI — auditar texto"`
  - `description`: audita texto jurídico e detecta prompt injection, jailbreak, PII exposta, citações/leis/súmulas suspeitas, jurisprudência suspeita e alucinações.
  - `annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true }` (chama LLM externo).
  - `inputSchema` (Zod):
    - `text: string` (1–80.000 chars) — obrigatório
    - `context?: string` (até 20.000) — contexto do caso opcional
    - `skip_llm?: boolean` — pula estágio D (mais rápido, sem gasto de LLM)
  - `handler`:
    - Reutiliza o pipeline existente através do server-fn `auditRawText` (encaminhando o token do caller via `createClient` + `Bearer ctx.getToken()` — mesmo padrão dos outros tools) **ou** chama diretamente a função interna `runPipeline` importando de um novo módulo server-only (ver abaixo).
    - Retorna:
      - `content: [{ type: "text", text: <resumo Markdown com contagem por severidade> }]`
      - `structuredContent: { score, model, stages, findings: [{ id, category, severity, snippet, start, end, explanation, suggested_fix, confidence, evidence }] }`
    - Erros em `isError: true`.

**Novo — `src/lib/mcp/tools/audit_piece.ts`** (bonus, mesmo padrão dos outros tools de escrita/leitura de peça)
- `inputSchema: { piece_id: string uuid, force?: boolean, skip_llm?: boolean }`
- Consulta `pieces` via cliente com token do usuário (RLS), roda pipeline, persiste em `piece_audits` (mesma lógica de `auditPieceContent`) e retorna o registro salvo + findings estruturados.

**Refactor mínimo — `src/lib/audit.functions.ts`**
- Extrair a função `runPipeline` e o helper `hashContent` para `src/lib/audit/pipeline.server.ts` (arquivo `.server.ts`, server-only) para poder ser reutilizada tanto pelos server-fns existentes quanto pelos handlers MCP sem passar pela camada RPC do TanStack. `audit.functions.ts` passa a importar dali.

**Atualizar — `src/lib/mcp/index.ts`**
- Importar `auditText` e `auditPiece`, incluir no array `tools`.
- Atualizar `instructions` mencionando as novas ferramentas Detect.AI.

**Validar manifesto**
- Rodar `app_mcp_server--extract_mcp_manifest` após as edições para regenerar `.lovable/mcp/manifest.json` (11 tools).

## Formato do retorno estruturado

```json
{
  "score": 78,
  "model": "google/gemini-3.5-flash",
  "stages": { "A_heuristics_ms": 4, "B_citations_count": 3, ... },
  "findings": [
    {
      "id": "h_1",
      "category": "fake_jurisprudence",
      "severity": "high",
      "snippet": "Súmula 9999 do STJ",
      "start": 412,
      "end": 431,
      "explanation": "Súmula fora do intervalo válido do STJ.",
      "suggested_fix": "Verificar a numeração da súmula",
      "confidence": 0.9,
      "evidence": { "source": "stj_sumulas", "detail": "..." }
    }
  ]
}
```

## Segurança
- Ambas as tools ficam sob o mesmo OAuth Supabase já configurado — `ctx.isAuthenticated()` obrigatório.
- `audit_piece` usa cliente com bearer do usuário (RLS garante que só ausculta peças próprias).
- `audit_text` não persiste nada; texto/contexto ficam apenas em memória durante a execução.
- Handler mantém-se import-safe (segredos como `LOVABLE_API_KEY` só são lidos dentro do pipeline, no runtime).
