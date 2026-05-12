## Etapa 5 — Validação Jurídica & Análise de Risco

Objetivo: ativar as colunas `validation` e `risk` (já reservadas em `vl_versions`) com geração assistida por IA após cada `finishGeneration`, mais UI dedicada no sidebar do Visual Law AI. Mantém Etapa 4 intacta (persistência) e prepara terreno para Etapa 6 (export).

### Backend (edge function)

Nova função `supabase/functions/analyze-visual-law/index.ts`:

- Input: `{ content: string, legalMetadata: VLLegalMetadata, direction: VLDirection }`.
- Usa Lovable AI Gateway (`google/gemini-2.5-flash`, response_format JSON) com prompt jurídico estruturado.
- Output JSON com dois objetos: `validation: VLLegalValidation` e `risk: VLRiskAnalysis` (mesmas chaves do tipo).
- `verify_jwt = true` (default). Tratamento de 429/402 → resposta tipada `{ error: "rate_limit"|"credits" }`.
- Prompts isolados em `prompts.ts` (mesmo padrão de `generate-visual-law`).

Sem nova migração — colunas `validation`/`risk` (jsonb) já existem em `vl_versions`.

### Camada de serviço (frontend)

`src/services/visual-law/analyze.ts` (novo):

- `runAnalysis({ content, legalMetadata, direction })` → `Promise<{ validation: VLLegalValidation; risk: VLRiskAnalysis }>` chamando a edge function via `supabase.functions.invoke`.
- Trata erros (rate limit/credits) com `toast` + retorna `null` para degrade gracioso.

`src/services/visual-law/versions.ts`:

- Novo `updateVersionAnalysis(versionId, { validation, risk })` → `update vl_versions set validation, risk where id = $1`. Necessário policy de UPDATE (ver migração abaixo).

### Migração complementar

```sql
create policy "vl_versions_update_own_analysis" on public.vl_versions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Apenas isso — sem novas colunas. Documentar que update é restrito a campos `validation`/`risk` por convenção (sem trigger restritivo nesta etapa para manter simples).

### Store (`src/stores/visualLaw.ts`)

- Estado adicional: `analysisStatus: Record<versionId, "idle"|"running"|"done"|"error">`.
- Actions:
  - `setAnalysisStatus(versionId, status)`.
  - `setVersionAnalysis(versionId, { validation, risk })` → atualiza `versions[i].validation`/`risk` imutavelmente.

### Orquestrador

`src/services/visual-law/generate.ts`:

- Após `finishGeneration` + `persistVersion`, dispara `runAnalysis` em background (não bloqueia UX).
- Em sucesso → `setVersionAnalysis` + `updateVersionAnalysis` (BD).
- Em falha → `setAnalysisStatus(versionId, "error")`, log silencioso.

### UI nova

1. **`src/components/visual-law/legal/LegalAnalysisPanel.tsx`** — card colapsável dentro do `ConfigSidebar` (nova aba "Análise"). Mostra:
   - Estado: skeleton enquanto `running`, conteúdo quando `done`, mensagem de erro com botão "Tentar novamente" quando `error`.
   - Seção "Validação Jurídica" com 4 listas: alegações sem prova, teses sem fundamento, pedidos órfãos, placeholders. Cada item com badge de severidade visual (cor de aviso) e ícone (`AlertTriangle`).
   - Seção "Análise de Risco" com 4 listas: fragilidades probatórias, vícios formais, riscos de improcedência, argumentos adversos. Mesmo padrão visual.
   - Listas vazias renderizam estado positivo (`CheckCircle2` + "Nenhum apontamento").

2. **`src/components/visual-law/sidebar/ConfigSidebar.tsx`** — adicionar nova `TabsTrigger` "Análise" entre "Aparência" e "Refinar". Mostra contador de issues no badge da aba (soma `validation` + `risk` arrays length).

3. **`src/components/visual-law/versions/VersionCard.tsx`** — pequeno indicador (`ShieldAlert` quando há issues, `ShieldCheck` quando análise completa sem issues, sem ícone quando análise pendente).

### Hidratação

`useLoadVersions.ts`: já carrega `validation`/`risk` (mapeamento adicionado em `versions.ts` na Etapa 4 — verificar e ajustar `mapRowToVersion` para incluir esses campos).

### Smoke test

1. Gerar nova versão → ver "running" no card de análise → resultado popula listas em ~3-8s.
2. Recarregar peça → análise persistida volta hidratada.
3. Versão sem issues → estado positivo renderiza.
4. Edge function retorna 429 → toast + estado de erro + botão retry funcional.
5. Build passa, RLS impede update de versões alheias.

### Fora do escopo

- **Etapa 6**: export PDF/DOCX da nova plataforma.
- Re-análise manual sob demanda (botão "Reanalisar") — pode entrar como melhoria.
- Diff de issues entre versões.
- Notificação push quando análise completa em background.

### Riscos / mitigação

- **Custo de tokens dobrado** (geração + análise): usar `gemini-2.5-flash` (mais barato), análise é fire-and-forget.
- **Inconsistência se análise falha**: `analysisStatus = "error"` permite retry futuro; versão segue utilizável.
- **Update RLS**: policy permite update de qualquer coluna; mitigação suficiente nesta etapa, refinar com trigger se Etapa 6 exigir mais escrita.