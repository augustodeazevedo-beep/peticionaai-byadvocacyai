# Diagnóstico

Reproduzi o erro no domínio publicado (`/login`) e capturei o console:

```
[Supabase] Missing Supabase environment variable(s):
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
Connect Supabase in Lovable Cloud.
```

O bundle `index-1XI0webW.js` é renderizado no browser sem as variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` embutidas. Quando o `AuthProvider` (carregado em `__root.tsx`) tenta inicializar o cliente Supabase, ele lança, o root `errorComponent` captura, e aparece a tela "This page didn't load / The app encountered an error".

**Por que aconteceu:** o `.env` local hoje já contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, mas o build publicado atualmente em produção foi gerado **antes** dessas variáveis serem expostas com prefixo `VITE_`. Como o Vite faz inlining em build-time, o JS publicado ficou com strings vazias para as duas variáveis e dispara o erro no browser.

**Por que o preview funciona, mas o publicado não:** o sandbox de preview usa o `.env` atual (já corrigido). O publicado usa o artefato antigo até ser republicado.

# Plano

1. **Republicar o app** (ação do usuário no botão Publish → Update). Isso é o suficiente para corrigir o erro imediatamente, porque o novo build vai inlinear `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` corretamente.

2. **Tornar o erro de env mais informativo** em `src/integrations/supabase/client.ts` — apenas a string da mensagem (a lógica permanece). Hoje a mensagem reporta sempre `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` mesmo quando o que faltou foi a variável `VITE_*`, o que confunde o diagnóstico. Vou listar a variável real que faltou (`VITE_SUPABASE_URL` no browser, `SUPABASE_URL` no SSR).

   > Observação: o cabeçalho do arquivo diz "do not edit". Esse comentário se refere às credenciais geradas; a função `createSupabaseClient` é segura para ajustar a mensagem de erro sem alterar contrato. Se preferir não tocar nesse arquivo, posso pular esta etapa — o passo 1 sozinho resolve o problema funcional.

3. **Verificação pós-publish**: abrir `/login` no domínio publicado, conferir console limpo e que o formulário de login renderiza.

# Detalhes técnicos

- Arquivo afetado: `src/integrations/supabase/client.ts` (somente texto da mensagem de erro).
- Nada muda em rotas, autenticação, RLS, edge functions ou variáveis de ambiente.
- Nenhuma migração de banco.
- O `errorComponent` em `__root.tsx` continua igual — ele só estava fazendo seu trabalho ao capturar o throw.

# Fora do escopo

- Não vou alterar `vite.config.ts`, `wrangler.jsonc`, `src/server.ts`, `auth-middleware.ts` nem o fluxo de auth.
- Não vou mexer em `.env` (gerenciado automaticamente pela plataforma).
