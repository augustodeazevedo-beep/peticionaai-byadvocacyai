import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Authenticate caller via JWT
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = auth.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse body
    let piece_id: string;
    try {
      const body = await req.json();
      piece_id = body.piece_id;
    } catch {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!piece_id) {
      return new Response(JSON.stringify({ error: "piece_id é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch piece – scoped to the authenticated user
    const { data: piece, error: pieceError } = await supabase
      .from("pieces")
      .select("id, title, piece_type, area, content_html, content_text, created_at")
      .eq("id", piece_id)
      .eq("user_id", userId)
      .single();

    if (pieceError || !piece) {
      return new Response(JSON.stringify({ error: "Peça não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = (piece.title as string) ?? "Peça Jurídica";
    const area = (piece.area as string | null) ?? "—";
    const createdAt = piece.created_at
      ? new Date(piece.created_at as string).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    // Prefer HTML content; fall back to plain text wrapped in <pre>
    const rawContent = (piece.content_html as string | null) ??
      (piece.content_text as string | null) ?? "";
    const bodyContent = (piece.content_html as string | null)
      ? rawContent
      : `<pre style="white-space:pre-wrap;font-family:inherit">${rawContent
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Page setup ── */
    html { font-size: 12pt; }
    body {
      font-family: "Arial", "Helvetica", sans-serif;
      background: #fff;
      color: #000;
      padding: 3cm 3cm 2cm 4cm; /* ABNT margins: top 3, right 2, bottom 2, left 4 cm */
      max-width: 21cm;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* ── Header / metadata ── */
    header.doc-header {
      border-bottom: 2px solid #000;
      padding-bottom: 0.6em;
      margin-bottom: 1.6em;
    }
    header.doc-header .doc-title {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 0.4em;
    }
    header.doc-header .doc-meta {
      font-size: 9pt;
      color: #444;
      display: flex;
      gap: 2em;
      justify-content: center;
      flex-wrap: wrap;
    }
    header.doc-header .doc-meta span {
      white-space: nowrap;
    }

    /* ── Body content ── */
    .doc-body {
      text-align: justify;
      font-size: 12pt;
    }
    .doc-body h1, .doc-body h2, .doc-body h3 {
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin: 1.4em 0 0.6em;
    }
    .doc-body h1 { font-size: 14pt; }
    .doc-body h2 { font-size: 13pt; }
    .doc-body h3 { font-size: 12pt; text-align: left; }
    .doc-body p {
      margin-bottom: 0.8em;
      text-indent: 2.5cm;
    }
    .doc-body ul, .doc-body ol {
      padding-left: 2em;
      margin-bottom: 0.8em;
    }
    .doc-body li { margin-bottom: 0.3em; }
    .doc-body blockquote {
      margin: 0.8em 0 0.8em 4cm;
      font-size: 10pt;
      line-height: 1.0;
    }
    .doc-body strong { font-weight: bold; }
    .doc-body em { font-style: italic; }

    /* ── Footer ── */
    footer.doc-footer {
      margin-top: 2em;
      padding-top: 0.6em;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #888;
      text-align: center;
    }

    /* ── Print ── */
    @media print {
      body { padding: 0; }
      @page { margin: 3cm 2cm 2cm 4cm; }
      footer.doc-footer { display: none; }
    }
  </style>
</head>
<body>
  <header class="doc-header">
    <div class="doc-title">${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div class="doc-meta">
      <span><strong>Área:</strong> ${area.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
      <span><strong>Data:</strong> ${createdAt}</span>
    </div>
  </header>

  <main class="doc-body">
    ${bodyContent}
  </main>

  <footer class="doc-footer">
    Documento gerado por Peticiona.AI em ${new Date().toLocaleDateString("pt-BR")}
  </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="peticao.html"`,
      },
    });
  } catch (e) {
    console.error("export-document error:", e);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar o documento." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
