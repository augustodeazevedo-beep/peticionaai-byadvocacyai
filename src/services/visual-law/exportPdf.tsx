import type { VLVersion, VLFontFamily } from "@/types/visual-law";
import { parseMarkdownBlocks, type Block, type InlineRun } from "./markdown";

const FONT_MAP: Record<VLFontFamily, string> = {
  Helvetica: "Helvetica",
  Charter: "Times-Roman",
  Playfair: "Times-Roman",
};

const DENSITY_GAP: Record<VLVersion["config"]["density"], number> = {
  enxuto: 4,
  padrao: 7,
  confortavel: 11,
};

export interface ExportOptions {
  title?: string;
  includeAnalysis?: boolean;
}

export async function exportVersionToPdf(
  version: VLVersion,
  opts: ExportOptions = {},
): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await import("@react-pdf/renderer");
  const { createElement: h } = await import("react");

  const blocks = parseMarkdownBlocks(version.content);
  const fontFamily = FONT_MAP[version.config.fontFamily] ?? "Helvetica";
  const primary = version.config.primaryColor || "#283753";
  const gap = DENSITY_GAP[version.config.density];

  const styles = StyleSheet.create({
    page: { padding: 56, fontFamily, fontSize: 11, lineHeight: 1.4, color: "#111" },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: primary,
      paddingBottom: 6,
      marginBottom: 12,
    },
    headerTitle: { fontSize: 14, color: primary, fontWeight: 700 },
    headerMeta: { fontSize: 9, color: "#666", marginTop: 2 },
    h1: { fontSize: 18, color: primary, fontWeight: 700, marginTop: gap + 6, marginBottom: gap },
    h2: { fontSize: 14, color: primary, fontWeight: 700, marginTop: gap + 3, marginBottom: gap - 2 },
    h3: { fontSize: 12, color: primary, fontWeight: 700, marginTop: gap, marginBottom: gap - 3 },
    p: { marginBottom: gap },
    bq: {
      marginBottom: gap,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: primary,
      color: "#444",
      fontStyle: "italic",
    },
    code: {
      marginBottom: gap,
      padding: 6,
      backgroundColor: "#f4f4f6",
      fontFamily: "Courier",
      fontSize: 9,
    },
    listItem: { flexDirection: "row", marginBottom: 2 },
    bullet: { width: 14, color: primary },
    hr: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginVertical: gap },
    appendixTitle: { fontSize: 14, color: primary, fontWeight: 700, marginBottom: 6, marginTop: 18 },
    appendixSection: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4 },
    appendixItem: { fontSize: 10, marginBottom: 2, color: "#333" },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 56,
      right: 56,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: "#888",
    },
  });

  const renderRuns = (runs: InlineRun[]) =>
    runs.map((r, i) =>
      h(
        Text,
        {
          key: i,
          style: {
            fontWeight: r.bold ? 700 : 400,
            fontStyle: r.italic ? "italic" : "normal",
          },
        },
        r.text,
      ),
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
          { key: i, style: { marginBottom: gap } },
          b.items.map((item, j) =>
            h(
              View,
              { key: j, style: styles.listItem },
              h(Text, { style: styles.bullet }, b.ordered ? `${j + 1}.` : "•"),
              h(Text, { style: { flex: 1 } }, renderRuns(item)),
            ),
          ),
        );
    }
  };

  const includeAnalysis = !!opts.includeAnalysis && !!version.validation && !!version.risk;
  const title = opts.title || version.legalMetadata.pieceType || "Documento Visual Law";
  const headerMeta = [
    version.legalMetadata.pieceType,
    version.legalMetadata.area,
    new Date(version.timestamp).toLocaleString("pt-BR"),
  ]
    .filter(Boolean)
    .join(" · ");

  const validationGroups: { label: string; items: string[] }[] = includeAnalysis
    ? [
        { label: "Alegações sem prova", items: version.validation!.alegacoesSemProva },
        { label: "Teses sem fundamento", items: version.validation!.tesesSemFundamento },
        { label: "Pedidos órfãos", items: version.validation!.pedidosOrfaos },
        { label: "Placeholders pendentes", items: version.validation!.placeholders },
      ]
    : [];
  const riskGroups: { label: string; items: string[] }[] = includeAnalysis
    ? [
        { label: "Fragilidades probatórias", items: version.risk!.fragilidadesProbatorias },
        { label: "Vícios formais", items: version.risk!.viciosFormais },
        { label: "Riscos de improcedência", items: version.risk!.riscosImprocedencia },
        { label: "Argumentos adversos prováveis", items: version.risk!.argumentosAdversos },
      ]
    : [];

  const doc = h(
    Document,
    {},
    h(
      Page,
      { size: "LETTER", style: styles.page },
      h(
        View,
        { style: styles.header, fixed: true },
        h(Text, { style: styles.headerTitle }, title),
        headerMeta ? h(Text, { style: styles.headerMeta }, headerMeta) : null,
      ),
      ...blocks.map(renderBlock),
      includeAnalysis
        ? h(
            View,
            { key: "appendix", break: true },
            h(Text, { style: styles.appendixTitle }, "Análise Jurídica"),
            h(Text, { style: styles.appendixSection }, "Validação"),
            ...validationGroups.flatMap((g, gi) => [
              h(Text, { key: `vh-${gi}`, style: { fontSize: 10, fontWeight: 700, marginTop: 4 } }, g.label),
              ...(g.items.length === 0
                ? [h(Text, { key: `vn-${gi}`, style: styles.appendixItem }, "Nenhum apontamento.")]
                : g.items.map((item, ii) =>
                    h(Text, { key: `vi-${gi}-${ii}`, style: styles.appendixItem }, `• ${item}`),
                  )),
            ]),
            h(Text, { style: styles.appendixSection }, "Risco"),
            ...riskGroups.flatMap((g, gi) => [
              h(Text, { key: `rh-${gi}`, style: { fontSize: 10, fontWeight: 700, marginTop: 4 } }, g.label),
              ...(g.items.length === 0
                ? [h(Text, { key: `rn-${gi}`, style: styles.appendixItem }, "Nenhum apontamento.")]
                : g.items.map((item, ii) =>
                    h(Text, { key: `ri-${gi}-${ii}`, style: styles.appendixItem }, `• ${item}`),
                  )),
            ]),
          )
        : null,
      h(
        View,
        { style: styles.footer, fixed: true },
        h(Text, {}, `Visual Law AI · ${new Date(version.timestamp).toLocaleDateString("pt-BR")}`),
        h(
          Text,
          { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` },
        ),
      ),
    ),
  );

  return await pdf(doc).toBlob();
}
