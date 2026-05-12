import { resolveBrandAssetUrl, type OfficeBrand } from "@/lib/officeBrand";
import { parseMarkdownBlocks, type Block, type InlineRun } from "@/services/visual-law/markdown";

const FONT_MAP: Record<string, string> = {
  Arial: "Helvetica",
  Helvetica: "Helvetica",
  "Times New Roman": "Times-Roman",
  Garamond: "Times-Roman",
  Calibri: "Helvetica",
  Georgia: "Times-Roman",
};

/**
 * Gera o PDF "pronto para protocolo" usando @react-pdf/renderer.
 * Margens ABNT: superior 3cm, esquerda 3cm, inferior 2cm, direita 2cm.
 * Cabeçalho/rodapé com papel timbrado conforme Brand Kit.
 */
export async function exportPiecePdfProtocolo(
  title: string,
  content: string,
  brand: OfficeBrand | null,
): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, Image, pdf } = await import("@react-pdf/renderer");
  const { createElement: h } = await import("react");

  const blocks = parseMarkdownBlocks(content);
  const fontFamily = FONT_MAP[brand?.font_family ?? "Arial"] ?? "Helvetica";
  const primary = brand?.primary_color ?? "#283753";
  const showLetterhead = brand?.letterhead_enabled ?? false;
  const layout = brand?.letterhead_layout ?? "topo";
  const HAS_TOP = showLetterhead && (layout === "topo" || layout === "minimal");

  const logoUrl = await resolveBrandAssetUrl(brand?.logo_url);

  // 1cm = 28.346pt
  const MARGIN = { top: 85, right: 57, bottom: 57, left: 85 };

  const styles = StyleSheet.create({
    page: {
      paddingTop: MARGIN.top + (HAS_TOP ? 50 : 0),
      paddingRight: MARGIN.right,
      paddingBottom: MARGIN.bottom + (showLetterhead ? 30 : 12),
      paddingLeft: MARGIN.left,
      fontFamily,
      fontSize: 12,
      lineHeight: 1.5,
      color: "#111",
    },
    header: {
      position: "absolute",
      top: 28,
      left: MARGIN.left,
      right: MARGIN.right,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1.5,
      borderBottomColor: primary,
      paddingBottom: 6,
    },
    logo: { maxHeight: 48, maxWidth: 110, objectFit: "contain" },
    headerText: { fontSize: 9, color: primary, lineHeight: 1.2 },
    headerName: { fontSize: 11, fontWeight: 700, color: primary },
    h1: { fontSize: 14, color: primary, fontWeight: 700, textAlign: "center", textTransform: "uppercase", marginTop: 14, marginBottom: 10 },
    h2: { fontSize: 13, color: primary, fontWeight: 700, marginTop: 12, marginBottom: 6 },
    h3: { fontSize: 12, color: primary, fontWeight: 700, marginTop: 10, marginBottom: 4 },
    p: { textAlign: "justify", textIndent: 70, marginBottom: 6 },
    bq: { marginLeft: 110, marginBottom: 6, fontSize: 10, lineHeight: 1.2, color: "#333" },
    code: { marginBottom: 6, padding: 6, backgroundColor: "#f4f4f6", fontFamily: "Courier", fontSize: 9 },
    listItem: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 18, color: primary },
    hr: { borderBottomWidth: 0.5, borderBottomColor: "#ccc", marginVertical: 8 },
    sigSep: { marginTop: 24, alignItems: "center" },
    sigLine: { borderBottomWidth: 0.7, borderBottomColor: "#111", width: 240, marginBottom: 4 },
    sigLineText: { fontSize: 11, textAlign: "center" },
    footer: {
      position: "absolute",
      bottom: 22,
      left: MARGIN.left,
      right: MARGIN.right,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: primary,
      borderTopWidth: 0.5,
      borderTopColor: `${primary}55`,
      paddingTop: 4,
    },
  });

  const renderRuns = (runs: InlineRun[]) =>
    runs.map((r, i) =>
      h(Text, {
        key: i,
        style: { fontWeight: r.bold ? 700 : 400, fontStyle: r.italic ? "italic" : "normal" },
      }, r.text),
    );

  const renderBlock = (b: Block, i: number) => {
    switch (b.kind) {
      case "heading": {
        const style = b.level === 1 ? styles.h1 : b.level === 2 ? styles.h2 : styles.h3;
        return h(Text, { key: i, style }, renderRuns(b.runs));
      }
      case "paragraph":
        return h(Text, { key: i, style: styles.p }, renderRuns(b.runs));
      case "blockquote":
        return h(Text, { key: i, style: styles.bq }, renderRuns(b.runs));
      case "code":
        return h(Text, { key: i, style: styles.code }, b.text);
      case "hr":
        return h(View, { key: i, style: styles.hr });
      case "list":
        return h(
          View,
          { key: i, style: { marginBottom: 6 } },
          b.items.map((item, j) =>
            h(View, { key: j, style: styles.listItem },
              h(Text, { style: styles.bullet }, b.ordered ? `${j + 1}.` : "•"),
              h(Text, { style: { flex: 1 } }, renderRuns(item)),
            ),
          ),
        );
    }
  };

  const headerEl = HAS_TOP
    ? h(View, { style: styles.header, fixed: true },
        logoUrl ? h(Image, { src: logoUrl, style: styles.logo }) : null,
        layout === "topo"
          ? h(View, {},
              brand?.firm_name ? h(Text, { style: styles.headerName }, brand.firm_name) : null,
              brand?.address ? h(Text, { style: styles.headerText }, brand.address) : null,
              h(Text, { style: styles.headerText },
                [brand?.phone, brand?.email, brand?.website].filter(Boolean).join(" · "),
              ),
            )
          : null,
      )
    : null;

  const footerEl = showLetterhead
    ? h(View, { style: styles.footer, fixed: true },
        h(Text, {}, brand?.firm_name ?? ""),
        h(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      )
    : null;

  const doc = h(Document, { title },
    h(Page, { size: "A4", style: styles.page },
      headerEl,
      ...blocks.map(renderBlock),
      footerEl,
    ),
  );

  return await pdf(doc).toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}