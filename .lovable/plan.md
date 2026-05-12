## Próxima iteração do Cognitive Legal OS

Concluímos o pipeline multi-etapas, a config em `system_settings` e o formulário expandido em `/pecas/nova`. Faltam dois itens da proposta original:

### 1. Painel "Inteligência" em `/pecas/$id`
Renderizar `pieces.checklist` (que agora guarda `{ cognitive, adversarial, audit }`) e `pieces.observations` (operator notes) em uma aba/seção dedicada, ao lado do conteúdo da peça.

**Componentes novos:**
- `src/components/pieces/IntelligencePanel.tsx` — 3 cards colapsáveis:
  - **Protocolo Cognitivo**: rito, competência, fase, controvérsias, timeline, provas classificadas, riscos
  - **Análise Adversarial**: argumentos contrários previstos, vulnerabilidades, neutralizações, objeções do juízo
  - **Auditoria interna**: checklist final (itens ✓/⚠), lacunas, placeholders pendentes
- `src/components/pieces/OperatorNotesPanel.tsx` — render markdown leve das `observations`

**Edição:**
- `src/routes/_authenticated.pecas.$id.tsx` — adicionar Tabs ("Peça" | "Inteligência" | "Notas") ou painel lateral colapsável. Exibir badge com contagem de alertas/lacunas se a auditoria detectou algum.

### 2. Editor JSON da config em `/admin/integracoes`
Permitir que admins editem `cognitive_os_config` sem migration.

**Edição:**
- `src/routes/_authenticated.admin.integracoes.tsx` — nova seção "Cognitive OS":
  - Textarea com JSON formatado da chave `cognitive_os_config`
  - Validação Zod ao salvar (reusa schema de `src/lib/cognitiveOs.ts`)
  - Botões: "Restaurar padrão", "Validar", "Salvar"
  - Exibe `updated_at` / `updated_by` da última edição

### Detalhes técnicos
- Sem migrations novas. Apenas leitura/escrita em `system_settings` (RLS já cobre admin).
- Tipos `PieceIntelligence` já definidos em `src/lib/cognitiveOs.ts`; reusar.
- Se `pieces.checklist` vier no formato antigo (array de strings da versão pré-cognitive), o painel mostra fallback "Esta peça foi gerada em modo legado" e renderiza como lista simples.
- Sem mudanças no edge function `mike-generate` nem no formulário `/pecas/nova`.

### Fora de escopo
- Editor visual (form-based) da config — só JSON cru por enquanto.
- Re-execução parcial de etapas (ex.: rodar só a auditoria de novo) — fica para iteração futura.
- Comparação entre versões da config.