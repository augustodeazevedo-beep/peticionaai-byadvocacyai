## Objetivo da v1

Entregar um fluxo "Protocolar peça" que, a partir de uma peça já salva no app, produz um **pacote pronto-para-protocolo** (PDF/A assinado + anexos organizados + checklist) e leva o advogado direto ao sistema do tribunal correto. Sem chamadas de API de tribunal nesta fase — todas as APIs públicas (PJe/MNI 2.0, Codex/CNJ, e-Proc) entram como módulo de "protocolo automático" na Fase 2, atrás de feature flag.

## Escopo v1 (do que entrega)

1. **Cadastro de certificado A1** por usuário (.pfx/.p12 + senha), criptografado.
2. **Assinatura PAdES** do PDF da peça no servidor, com carimbo visível opcional (nome, OAB, data, hash).
3. **Composição de anexos** a partir de 3 fontes:
   - Biblioteca / `case_files` / `library_items` já no app
   - Google Drive e OneDrive (via connectors existentes)
   - Pasta local do PC do escritório, usando **File System Access API** (Chromium-based; fallback "arrastar arquivos" em outros navegadores)
4. **Pacote final**: PDF da peça assinado + anexos renomeados conforme convenção do tribunal + `checklist.pdf` com índice e instruções.
5. **Catálogo de tribunais** (PJe, e-SAJ, Projudi, eproc, PJe-TST, TRFs) com URL de protocolo, sistema, observações de credenciamento e dicas por tribunal. Botão **"Abrir tribunal e iniciar protocolo"** em nova aba, copiando a numeração/dados necessários para o clipboard.
6. **Histórico de protocolos** por peça (status: rascunho → assinado → empacotado → protocolado manualmente → confirmado), com upload do comprovante de protocolo emitido pelo tribunal.

## Fora do escopo v1 (registrar como Fase 2/3)

- Protocolo automático via API (PJe/MNI, Codex, eproc) — exige credenciamento por tribunal.
- Assinatura A3/token e certificado em nuvem (Bird ID/Vidaas/SafeID) — requer **Lacuna Web PKI** (licença comercial a contratar).
- Sincronização real de pasta local (exigiria agente desktop Electron).
- RPA para e-SAJ/Projudi (sem API pública).

## Arquitetura técnica

```text
src/
├── routes/
│   ├── _authenticated.protocolo.tsx                    # Lista de protocolos / fila
│   ├── _authenticated.pecas.$id.protocolar.tsx         # Wizard de protocolo
│   └── _authenticated.configuracoes.certificados.tsx   # Cadastro de A1
├── components/protocolo/
│   ├── ProtocoloWizard.tsx     # 4 passos: revisão → anexos → assinatura → empacotar
│   ├── AttachmentPicker.tsx    # Biblioteca | Drive | OneDrive | Pasta local | Upload
│   ├── LocalFolderPicker.tsx   # File System Access API + fallback drag-drop
│   ├── TribunalPicker.tsx      # Seleção tribunal/órgão/vara
│   └── ProtocolHistoryCard.tsx
├── lib/
│   ├── tribunais.ts            # Catálogo estático de tribunais, URLs, regras
│   └── protocolo.functions.ts  # server fns: sign, package, downloadBundle
└── services/protocolo/
    ├── pades-sign.server.ts    # Assinatura PAdES com node-signpdf + node-forge
    ├── pdfa-convert.server.ts  # PDF → PDF/A-2b via pdf-lib/ghostscript-wasm
    └── bundle.server.ts        # Monta ZIP final
```

### Banco de dados (novas tabelas)

- `user_certificates` — id, user_id, label, pfx_encrypted (bytea), cipher_iv, fingerprint, valid_from, valid_to. Senha do certificado **nunca** é guardada; é solicitada a cada uso e mantida só na memória do server fn.
- `tribunais` — seed estático em código (`src/lib/tribunais.ts`); não vai ao DB para evitar overhead.
- `protocolos` — id, user_id, piece_id, tribunal_code, orgao, numero_processo, status, bundle_path (Storage), signed_pdf_path, comprovante_path, protocolado_at, observacoes.
- `protocolo_attachments` — id, protocolo_id, source (`library|drive|onedrive|local|upload`), source_ref, filename, size, sha256, ordem.
- Bucket Storage privado `protocolo-bundles` com RLS por `user_id`.

### Servidor (TanStack `createServerFn`)

- `uploadCertificate({ pfx, label })` — criptografa com AES-GCM usando chave derivada de `process.env.CERT_ENCRYPTION_KEY` (novo secret) + valida cadeia ICP-Brasil.
- `signPiecePades({ piece_id, certificate_id, pfx_password, visible_stamp })` — descriptografa em memória, assina com `node-signpdf`, gera carimbo visível, salva em Storage, retorna URL temporária.
- `buildBundle({ protocolo_id })` — baixa peça assinada + anexos, normaliza nomes, gera `checklist.pdf` (reportlab equivalente em JS: `pdf-lib`), zipa e devolve URL.
- `getDriveFile({ file_id, provider })` — usa connectors Google Drive / OneDrive já listados em `useful-context`.

### Frontend — File System Access API

`LocalFolderPicker.tsx` usa `window.showDirectoryPicker()` para listar arquivos da pasta escolhida sob demanda; nada é sincronizado. Browsers sem suporte (Firefox/Safari) caem em `<input type="file" multiple webkitdirectory>` + drag-drop. Deixar claro na UI que é "leitura no momento do protocolo", não sync.

### Assinatura A1 — segurança

- `.pfx` criptografado em repouso (AES-256-GCM) com chave do server.
- Senha sempre digitada no momento do uso, transmitida via HTTPS para a server fn, descartada após assinatura.
- Log de uso em `integration_logs` (cert_id, piece_id, fingerprint, sucesso/erro).
- Nunca expor `pfx_encrypted` ao cliente; servir só metadados (label, validade, thumbprint).

### Catálogo de tribunais (v1)

`src/lib/tribunais.ts` com entradas como:
```ts
{ code: "TJSP", nome: "Tribunal de Justiça de SP", sistema: "esaj",
  url_protocolo: "https://esaj.tjsp.jus.br/...", aceita_pdf_a: true,
  tamanho_max_mb: 10, observacoes: "Anexos devem vir como PDF separados" }
```
Cobertura inicial: TJSP, TJRJ, TJMG, TJRS, TJPR, TRF1–6, TRT2/15/3, TST, STJ, STF, CNJ. Resto entra incrementalmente.

## UX do wizard

1. **Revisar peça** — preview do PDF gerado a partir do conteúdo Markdown salvo; opção de regenerar com `exportPiecePdfProtocolo` já existente em `src/services/pieces/exportPdfProtocolo.tsx`.
2. **Tribunal & processo** — escolhe tribunal, informa número CNJ (validação já existe em `src/lib/cnj.functions.ts`), órgão, classe, partes.
3. **Anexos** — abas Biblioteca / Drive / OneDrive / Pasta local / Upload. Drag-drop para reordenar. Mostra tamanho total vs limite do tribunal.
4. **Assinar & empacotar** — escolhe certificado A1, digita senha, configura carimbo visível, clica "Assinar e empacotar". Mostra progresso (assinando peça → assinando anexos → zipando).
5. **Protocolar** — tela final com: botão "Baixar pacote (.zip)", botão "Abrir tribunal" (nova aba para `url_protocolo`), checklist com itens "número do processo copiado", "PDF assinado baixado", etc., e botão "Marcar como protocolado" + upload do comprovante.

## Dependências e secrets novos

- npm: `node-signpdf`, `node-forge`, `pdf-lib` (já presente), `archiver` (zip server-side), `@pdf-lib/fontkit`.
- Secret: `CERT_ENCRYPTION_KEY` (32 bytes hex) — vou solicitar via `add_secret` na fase de build.
- Bucket Storage novo: `protocolo-bundles` (privado).

## Roadmap pós-v1 (documentar, não construir)

- **Fase 2.A** — Lacuna Web PKI: assinatura A3/token/nuvem no navegador, sem expor `.pfx` ao server.
- **Fase 2.B** — Integração PJe via MNI 2.0 / Codex CNJ para 1–2 tribunais piloto (credenciamento manual).
- **Fase 3** — Agente desktop Electron para sync real de pasta + assinatura local com token físico.
- **Fase 3.B** — RPA para e-SAJ/Projudi (Playwright server-side; precisa avaliar TOS).

## Riscos e decisões abertas

- **Validação de cadeia ICP-Brasil** no upload do A1: v1 valida apenas validade temporal e algoritmo; validação completa de cadeia AC raiz fica para Fase 2.
- **Carimbo visível**: posicionamento padrão (rodapé direito); customização por usuário em Fase 2.
- **Pasta local em Firefox/Safari**: experiência inferior; documentar no onboarding.
- **Tamanho do pacote**: limite de 100 MB por protocolo na v1 (alguns tribunais aceitam mais via múltiplos envios — fora do escopo).

## Critério de pronto

- Usuário consegue, em ≤ 6 cliques a partir da peça pronta, baixar um `.zip` com PDF/A assinado + anexos + checklist, e ser redirecionado para o sistema do tribunal correto com o número do processo no clipboard.
