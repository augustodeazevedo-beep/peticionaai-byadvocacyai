## Objetivo
Atualizar o secret `DATAJUD_API_KEY` no backend com a chave pública oficial do CNJ fornecida, para que a consulta de metadados em `/cnj` (via `src/lib/cnj.functions.ts`) volte a funcionar sem alterações de código.

## Passos
1. Usar `secrets--set_secret` para gravar `DATAJUD_API_KEY = cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==` (sobrescrever o valor atual).
   - Como `set_secret` só cria novos, se o nome já existir precisarei alternar para `secrets--update_secret` (abre form seguro) — nesse caso peço sua confirmação já pré-preenchendo, ou você cola no form.
2. Nenhuma alteração de código, migração ou UI.
3. Validar chamando a server function `lookupCnjMetadata` com um CNJ real (posso pedir um número de teste ou você consulta pela tela `/cnj` após o deploy do secret).

## Observação de segurança
A chave é pública/compartilhada (documentada pelo CNJ), então tudo bem versionar sua presença como secret — não há rotação individual. A `@security-memory` permanece igual.

Confirma que sigo?
