import type { VLVersion, VLFontFamily } from "@/types/visual-law";
import { parseMarkdownBlocks, type Block, type InlineRun } from "./markdown";

const FONT_MAP: Record<VLFontFamily, string> = {
  Helvetica: "Arial",
  Charter: "Georgia",
  Playfair: "Georgia",
};

export interface ExportDocxOptions {
  title?: string;
  includeAnalysis?: boolean;
}

export async function exportVersionToDocx(
  version: VLVersion,
  opts: ExportDocxOptions = {},
): Promise<Blob> {
  const docxLib = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    PageOrientation,
    LevelFormat,
    Header,
    Footer,
    PageNumber,
    BorderStyle,
  } = docxLib;

  const blocks = parseMarkdownBlocks(version.content);
  const fontFamily = FONT_MAP[version.config.fontFamily] ?? "Arial";
  const primary = (version.config.primaryColor || "#283753").replace("#", "");
  const includeAnalysis = !!opts.includeAnalysis && !!version.validation && !!version.risk;
  const title = opts.title || version.legalMetadata.pieceType || "Documento Visual Law";

  const runFactory = (runs: InlineRun[], extra?: { color?: string; size?: number; bold?: boolean }) =>
    runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: !!r.bold || !!extra?.bold,
          italics: !!r.italic,
          font: fontFamily,
          color: extra?.color,
          size: extra?.size,
        }),
    );

  const renderBlock = (b: Block): InstanceType<typeof Paragraph>[] => {
    switch (b.kind) {
      case "heading":
        return [
          new Paragraph({
            heading:
              b.level === 1
                ? HeadingLevel.HEADING_1
                : b.level === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
            children: runFactory(b.runs, { color: primary, bold: true }),
          }),
        ];
      case "paragraph":
        return [new Paragraph({ spacing: { after: 120 }, children: runFactory(b.runs) })];
      case "blockquote":
        return [
          new Paragraph({
            spacing: { after: 120 },
            indent: { left: 480 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: primary, space: 8 } },
            children: runFactory(b.runs, { color: "555555" }),
          }),
        ];
      case "code":
        return [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: b.text, font: "Courier New", size: 18 })],
          }),
        ];
      case "hr":
        return [
          new Paragraph({
            spacing: { after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } },
            children: [],
          }),
        ];
      case "list":
        return b.items.map(
          (item) =>
            new Paragraph({
              numbering: { reference: b.ordered ? "vl-numbers" : "vl-bullets", level: 0 },
              children: runFactory(item),
            }),
        );
    }
  };

  const bodyParagraphs = blocks.flatMap(renderBlock);

  const appendixParagraphs: InstanceType<typeof Paragraph>[] = [];
  if (includeAnalysis) {
    appendixParagraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "Análise Jurídica", bold: true, color: primary, font: fontFamily })],
      }),
    );

    const groups: { section: string; items: { label: string; entries: string[] }[] }[] = [
      {
        section: "Validação",
        items: [
          { label: "Alegações sem prova", entries: version.validation!.alegacoesSemProva },
          { label: "Teses sem fundamento", entries: version.validation!.tesesSemFundamento },
          { label: "Pedidos órfãos", entries: version.validation!.pedidosOrfaos },
          { label: "Placeholders pendentes", entries: version.validation!.placeholders },
        ],
      },
      {
        section: "Risco",
        items: [
          { label: "Fragilidades probatórias", entries: version.risk!.fragilidadesProbatorias },
          { label: "Vícios formais", entries: version.risk!.viciosFormais },
          { label: "Riscos de improcedência", entries: version.risk!.riscosImprocedencia },
          { label: "Argumentos adversos prováveis", entries: version.risk!.argumentosAdversos },
        ],
      },
    ];

    for (const g of groups) {
      appendixParagraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: g.section, bold: true, color: primary, font: fontFamily })],
        }),
      );
      for (const item of g.items) {
        appendixParagraphs.push(
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [new TextRun({ text: item.label, bold: true, font: fontFamily })],
          }),
        );
        if (item.entries.length === 0) {
          appendixParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: "Nenhum apontamento.", italics: true, font: fontFamily, color: "666666" })],
            }),
          );
        } else {
          for (const entry of item.entries) {
            appendixParagraphs.push(
              new Paragraph({
                numbering: { reference: "vl-bullets", level: 0 },
                children: [new TextRun({ text: entry, font: fontFamily })],
              }),
            );
          }
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: fontFamily, size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: fontFamily, color: primary },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: fontFamily, color: primary },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true, font: fontFamily, color: primary },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "vl-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "vl-numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primary, space: 4 } },
                children: [new TextRun({ text: title, bold: true, color: primary, font: fontFamily })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", font: fontFamily, size: 18, color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: fontFamily, size: 18, color: "888888" }),
                  new TextRun({ text: " de ", font: fontFamily, size: 18, color: "888888" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: fontFamily, size: 18, color: "888888" }),
                ],
              }),
            ],
          }),
        },
        children: [...bodyParagraphs, ...appendixParagraphs],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}
