import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Header,
  Footer,
  ImageRun,
  PageNumber,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "npm:docx@9.6.1";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hexClean(c: string | null | undefined, fallback = "283753") {
  if (!c) return fallback;
  return c.replace("#", "").padEnd(6, "0").slice(0, 6).toUpperCase();
}

async function fetchLogoBuffer(url: string | null | undefined): Promise<{ buf: Uint8Array; ext: "png" | "jpg" } | null> {
  if (!url) return null;
  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:") return null;
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) return null;
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    const buf = new Uint8Array(await r.arrayBuffer());
    const ext: "png" | "jpg" = ct.includes("jpeg") || ct.includes("jpg") || url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg") ? "jpg" : "png";
    return { buf, ext };
  } catch {
    return null;
  }
}

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

    const { data: brand } = await supabase
      .from("office_brand")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const primaryHex = hexClean(brand?.primary_color, "283753");
    const fontFamily = (brand?.font_family as string | undefined) || "Arial";
    const showLetterhead = !!brand?.letterhead_enabled;
    const layout = (brand?.letterhead_layout as string | undefined) ?? "topo";
    const logo = showLetterhead ? await fetchLogoBuffer(brand?.logo_url) : null;

    const text = (piece.content_text ?? "") as string;
    const lines = text.split(/\n/);

    const bodyParagraphs: Paragraph[] = [];
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (!line.trim()) {
        bodyParagraphs.push(new Paragraph({ children: [new TextRun("")] }));
        continue;
      }
      // Headings (Markdown)
      const h1 = line.match(/^# (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h3 = line.match(/^### (.+)/);
      if (h1) {
        bodyParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 240, after: 200 }, children: [new TextRun({ text: h1[1].toUpperCase(), bold: true, font: fontFamily, size: 28, color: primaryHex })] }));
      } else if (h2) {
        bodyParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: h2[1].toUpperCase(), bold: true, font: fontFamily, size: 26, color: primaryHex })] }));
      } else if (h3) {
        bodyParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 100 }, children: [new TextRun({ text: h3[1], bold: true, font: fontFamily, size: 24, color: primaryHex })] }));
      } else {
        // Detect long quote (line starts with > )
        const quote = line.match(/^>\s?(.+)/);
        if (quote) {
          bodyParagraphs.push(new Paragraph({
            indent: { left: 2268 }, // 4cm
            spacing: { line: 240 },
            children: [new TextRun({ text: quote[1], font: fontFamily, size: 20 })],
          }));
        } else {
          // Inline parser for **bold** and *italic*
          const runs = parseInline(line, fontFamily);
          bodyParagraphs.push(new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1418 }, // 2.5cm
            spacing: { line: 360, after: 60 }, // 1.5
            children: runs,
          }));
        }
      }
    }

    // Build header (letterhead)
    let header: Header | undefined;
    if (showLetterhead && (layout === "topo" || layout === "minimal")) {
      const headerChildren: Paragraph[] = [];
      if (logo && layout === "minimal") {
        headerChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: logo.buf, transformation: { width: 90, height: 50 }, type: logo.ext })],
        }));
      } else {
        // Topo: tabela 2 colunas (logo | dados)
        const dataRuns: Paragraph[] = [];
        if (brand?.firm_name) dataRuns.push(new Paragraph({ children: [new TextRun({ text: brand.firm_name as string, bold: true, font: fontFamily, size: 22, color: primaryHex })] }));
        if (brand?.address) dataRuns.push(new Paragraph({ children: [new TextRun({ text: brand.address as string, font: fontFamily, size: 16, color: primaryHex })] }));
        const contact = [brand?.phone, brand?.email, brand?.website].filter(Boolean).join(" · ");
        if (contact) dataRuns.push(new Paragraph({ children: [new TextRun({ text: contact, font: fontFamily, size: 14, color: primaryHex })] }));

        const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
        const bottomBorder = { style: BorderStyle.SINGLE, size: 8, color: primaryHex };

        const table = new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [2600, 6400],
          borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: noBorders,
                  width: { size: 2600, type: WidthType.DXA },
                  children: [
                    logo
                      ? new Paragraph({ children: [new ImageRun({ data: logo.buf, transformation: { width: 90, height: 50 }, type: logo.ext })] })
                      : new Paragraph({ children: [new TextRun("")] }),
                  ],
                }),
                new TableCell({
                  borders: noBorders,
                  width: { size: 6400, type: WidthType.DXA },
                  children: dataRuns.length ? dataRuns : [new Paragraph({ children: [new TextRun("")] })],
                }),
              ],
            }),
          ],
        });
        headerChildren.push(new Paragraph({ children: [], border: { bottom: bottomBorder } }));
        // Inserir a tabela antes do separador via children direto:
        header = new Header({ children: [table, new Paragraph({ children: [], border: { bottom: bottomBorder } })] });
      }
      if (!header) header = new Header({ children: headerChildren.length ? headerChildren : [new Paragraph({ children: [new TextRun("")] })] });
    }

    const footerChildren: Paragraph[] = [];
    if (showLetterhead) {
      footerChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${(brand?.firm_name as string) ?? ""}  ·  Página `, font: fontFamily, size: 16, color: primaryHex }),
          new TextRun({ children: [PageNumber.CURRENT], font: fontFamily, size: 16, color: primaryHex }),
          new TextRun({ text: " de ", font: fontFamily, size: 16, color: primaryHex }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: fontFamily, size: 16, color: primaryHex }),
        ],
      }));
    }
    const footer = footerChildren.length ? new Footer({ children: footerChildren }) : undefined;

    const doc = new Document({
      styles: { default: { document: { run: { font: fontFamily, size: 24 } } } },
      sections: [{
        properties: { page: { margin: { top: 1701, right: 1134, bottom: 1417, left: 1701 } } }, // 3cm/2cm/2.5cm/3cm
        headers: header ? { default: header } : undefined,
        footers: footer ? { default: footer } : undefined,
        children: bodyParagraphs,
      }],
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
    return new Response(JSON.stringify({ error: "Erro ao gerar o documento." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function parseInline(line: string, font: string): TextRun[] {
  const runs: TextRun[] = [];
  // Regex que captura **bold**, *italic*, e texto normal.
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: line.slice(last, m.index), font, size: 24 }));
    if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, font, size: 24 }));
    else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true, font, size: 24 }));
    last = m.index + m[0].length;
  }
  if (last < line.length) runs.push(new TextRun({ text: line.slice(last), font, size: 24 }));
  if (!runs.length) runs.push(new TextRun({ text: line, font, size: 24 }));
  return runs;
}