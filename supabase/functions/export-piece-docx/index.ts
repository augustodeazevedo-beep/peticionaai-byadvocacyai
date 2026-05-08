import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "npm:docx@9.6.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    const token = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { piece_id } = await req.json();
    const { data: piece, error } = await supabase.from("pieces").select("*").eq("id", piece_id).eq("user_id", userId).single();
    if (error || !piece) return new Response("Not found", { status: 404, headers: corsHeaders });

    const text = (piece.content_text ?? "") as string;
    const lines = text.split(/\n/);

    const children: Paragraph[] = [];
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (!line.trim()) {
        children.push(new Paragraph({ children: [new TextRun("")] }));
        continue;
      }
      // Headings (Markdown)
      const h1 = line.match(/^# (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h3 = line.match(/^### (.+)/);
      if (h1) {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: h1[1].toUpperCase(), bold: true, font: "Arial", size: 28 })] }));
      } else if (h2) {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: h2[1].toUpperCase(), bold: true, font: "Arial", size: 24 })] }));
      } else if (h3) {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: h3[1], bold: true, font: "Arial", size: 24 })] }));
      } else {
        // Detect long quote (line starts with > )
        const quote = line.match(/^>\s?(.+)/);
        if (quote) {
          children.push(new Paragraph({
            indent: { left: 2268 }, // 4cm
            spacing: { line: 240 },
            children: [new TextRun({ text: quote[1], font: "Arial", size: 20 })],
          }));
        } else {
          // Strip simple markdown bold/italic markers for display
          const clean = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
          children.push(new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1418 }, // 2.5cm
            spacing: { line: 360 }, // 1.5
            children: [new TextRun({ text: clean, font: "Arial", size: 24 })],
          }));
        }
      }
    }

    const doc = new Document({
      sections: [{ properties: { page: { margin: { top: 1701, right: 1134, bottom: 1701, left: 1701 } } }, children }],
    });

    const buf = await Packer.toBuffer(doc);
    const path = `${userId}/${piece_id}-${Date.now()}.docx`;
    const { error: upErr } = await supabase.storage.from("piece-exports").upload(path, buf, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: signed } = await supabase.storage.from("piece-exports").createSignedUrl(path, 60 * 60);

    await supabase.from("pieces").update({ status: "exported" }).eq("id", piece_id);

    return new Response(JSON.stringify({ url: signed?.signedUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});