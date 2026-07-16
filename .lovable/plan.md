## Objetivo

1. Tela dedicada de configurações do Detect.AI (por usuário) para ajustar o nível de severidade que bloqueia e as regras de validação por tipo de risco.
2. Etapa automática de verificação Detect.AI ao **finalizar** (mudar status para `final`) e ao **exportar** (DOCX/PDF) uma peça, com bloqueio conforme as configurações.

## Parte 1 — Configurações do Detect.AI

### Banco (nova tabela `detectai_prefs`)
Colunas principais (uma linha por `user_id`, UNIQUE):
- `block_threshold` enum: `off | high | medium | low` (severidade mínima que bloqueia; default `high`)
- `enforce_on_finalize` bool (default `true`)
- `enforce_on_export` bool (default `true`)
- `rules` jsonb — habilita/desabilita cada detector e ajusta severidade individual:
  - `prompt_injection` {enabled, severity}
  - `jailbreak` {enabled, severity}
  - `pii_leak` {enabled, severity}
  - `citation_law` {enabled, severity}      — leis/artigos
  - `citation_sumula` {enabled, severity}   — súmulas
  - `citation_precedent` {enabled, severity} — HC/REsp/AI etc.
  - `hallucination_llm` {enabled, severity} — auditor LLM
  - `contradiction_llm` {enabled, severity}
- `llm_auditor_enabled` bool (default `true`) — liga/desliga Stage D
- `allowlist_patterns` text[] — regex que suprime falso-positivo

RLS: `auth.uid() = user_id`. GRANT authenticated + service_role. Trigger `updated_at`.

### UI: `/configuracoes/detect-ai`
- Card "Bloqueio": radio de severidade mínima que bloqueia + toggles `enforce_on_finalize` / `enforce_on_export`.
- Card "Detectores": lista de 8 detectores com switch on/off + select de severidade (low/medium/high/critical) por regra.
- Card "Auditor LLM (Stage D)": switch + explicação de custo (tokens).
- Card "Allowlist": textarea com uma regex por linha (validação segura).
- Botões: Salvar / Restaurar padrões.
- Link a partir da aba Detect.AI do editor ("Ajustar regras").

### Server functions (`src/lib/detectai.functions.ts`)
- `getDetectAiPrefs()` — retorna prefs do user (autocria com defaults se ausente).
- `saveDetectAiPrefs(input)` — Zod validator, upsert.
- `resetDetectAiPrefs()`.

### Integração com o pipeline existente
- `src/lib/audit.functions.ts` (`auditPieceContent`) já roda os 4 estágios. Vai passar a **carregar as prefs do usuário** e:
  - pular detectores desabilitados;
  - ajustar `severity` de cada finding pela configuração;
  - aplicar allowlist (suprime finding cujo `snippet` casa com regex);
  - pular Stage D quando `llm_auditor_enabled=false`.
- O `score` continua sendo calculado, mas o **veredito de bloqueio** passa a ser: existe finding com severity ≥ `block_threshold` entre regras habilitadas.

## Parte 2 — Verificação obrigatória ao finalizar/exportar

### Novo helper `runDetectAiGate(pieceId, trigger)` (server fn)
- Chama `auditPieceContent(pieceId)` (reaproveita cache por SHA-256 do conteúdo).
- Aplica prefs → devolve `{ blocked: boolean, findings, score, threshold, trigger }`.
- Grava em `piece_audits` (já existe) marcando `trigger` (`finalize` | `export_docx` | `export_pdf` | `manual`).

### Hooks no editor `/pecas/$id`
- **Finalizar**: botão "Marcar como final" agora chama `runDetectAiGate(id, "finalize")` **antes** do update de status:
  - `blocked=true` e `enforce_on_finalize=true` → abre modal `DetectAiGateDialog` listando findings; ações: "Corrigir na aba Detect.AI", "Ignorar e finalizar mesmo assim" (registra `dismissed_by_user` no audit e só disponível se o usuário tiver override manual — checkbox "estou ciente").
  - `blocked=false` → segue o update normal.
- **Exportar (DOCX/PDF)**: mesmo gate antes de disparar `exportPieceDocx`/`exportPiecePdf`, com `enforce_on_export`.

### Componente `DetectAiGateDialog.tsx`
- Score ring + lista compacta de findings críticos (severity ≥ threshold), com CTA para abrir a aba Detect.AI.
- Botão "Rodar verificação novamente" (força bypass de cache).
- Se auditor LLM estiver desligado, mostra aviso de que só heurísticas rodaram.

### UX de transparência
- Badge na barra superior do editor: `Detect.AI: última verificação há Xmin — score 87` (verde/âmbar/vermelho conforme threshold).
- Ao finalizar/exportar sem findings acima do threshold, toast "Verificação Detect.AI aprovada".

## Detalhes técnicos

- **Cache**: `piece_audits` já indexa por `content_hash`; se hash bater, reusa findings — mas o **gate re-aplica prefs atuais** (severidade/allowlist são runtime-side, não são gravadas no cache).
- **Segurança**: `runDetectAiGate` sempre via `requireSupabaseAuth`; nunca aceita `content_text` do cliente — busca do banco.
- **Regex allowlist**: compilar com try/catch, marcar inválidas na UI, timeout por regra (evitar ReDoS).
- **Migração**: `CREATE TABLE public.detectai_prefs` + GRANT + RLS + POLICY (usuário só lê/escreve o próprio), sem afetar `piece_audits`.

## Arquivos a criar/editar

Novos:
- `src/lib/detectai.functions.ts` (getPrefs/savePrefs/resetPrefs/runDetectAiGate)
- `src/routes/_authenticated.configuracoes.detect-ai.tsx`
- `src/components/detectai/RuleRow.tsx`
- `src/components/detectai/DetectAiGateDialog.tsx`
- Migração SQL para `detectai_prefs`.

Editar:
- `src/lib/audit.functions.ts` — aplicar prefs (habilitar/desabilitar, severidade, allowlist, skip Stage D).
- `src/routes/_authenticated.pecas.$id.tsx` — gate no finalizar e nos botões de exportação, badge de status.
- `src/components/pieces/AuditPanel.tsx` — link "Ajustar regras" → `/configuracoes/detect-ai`.
- `src/routes/_authenticated.configuracoes.tsx` (índice, se existir) — item de menu Detect.AI.

## Fora do escopo

- Compartilhar preferências entre membros de escritório (é por usuário nesta v1).
- Regras customizadas do usuário (adicionar novos detectores). Fica para v2.
- Auditoria automática em background (só roda nos gatilhos + botão manual).