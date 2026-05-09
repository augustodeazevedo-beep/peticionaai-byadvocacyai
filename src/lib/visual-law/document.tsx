import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { densityToSizes, resolvePalette, type VisualLawStyle } from "./types";
import { parsePieceText, type Block } from "./parser";

type Props = {
  title: string;
  authorOrCase?: string;
  contentText: string;
  style: VisualLawStyle;
};

export function VisualLawDocument({ title, authorOrCase, contentText, style }: Props) {
  const palette = resolvePalette(style);
  const sizes = densityToSizes(style.density);
  const blocks = parsePieceText(contentText);
  const showCapa = !!style.elements.capa;
  const showNum = style.elements.numeracao !== false;

  const sx = StyleSheet.create({
    page: {
      backgroundColor: palette.bg,
      color: palette.text,
      fontFamily: style.font,
      fontSize: sizes.base,
      lineHeight: sizes.line,
      paddingTop: 56,
      paddingBottom: 64,
      paddingHorizontal: 56,
    },
    coverWrap: { flexGrow: 1, justifyContent: "center", alignItems: "flex-start" },
    coverBar: { width: 60, height: 6, backgroundColor: palette.accent, marginBottom: 24 },
    coverTitle: { fontSize: 30, color: palette.primary, fontWeight: 700 },
    coverSub: { fontSize: 12, color: palette.muted, marginTop: 12 },
    h1: { fontSize: sizes.h1, color: palette.primary, fontWeight: 700, marginTop: sizes.gap * 1.6, marginBottom: sizes.gap },
    h2: { fontSize: sizes.h2, color: palette.primary, fontWeight: 700, marginTop: sizes.gap * 1.2, marginBottom: sizes.gap * 0.6 },
    h3: { fontSize: sizes.h3, color: palette.primary, fontWeight: 700, marginTop: sizes.gap, marginBottom: sizes.gap * 0.4 },
    p: { marginBottom: sizes.gap, textAlign: "justify" },
    quote: {
      borderLeftWidth: 3,
      borderLeftColor: palette.accent,
      paddingLeft: 10,
      paddingVertical: 6,
      marginVertical: sizes.gap,
      color: palette.muted,
      fontStyle: "italic",
    },
    quadro: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 4,
      padding: 10,
      marginVertical: sizes.gap,
      backgroundColor: "#fafafa",
    },
    quadroTitle: { color: palette.primary, fontWeight: 700, marginBottom: 4 },
    timelineItem: { flexDirection: "row", marginBottom: 6 },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.accent,
      marginTop: 4,
      marginRight: 8,
    },
    timelineWhen: { fontWeight: 700, color: palette.primary, marginRight: 6 },
    footer: {
      position: "absolute",
      bottom: 28,
      left: 56,
      right: 56,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8,
      color: palette.muted,
    },
    headerStrip: { width: "100%", height: 3, backgroundColor: palette.accent, marginBottom: 18 },
  });

  const renderBlock = (b: Block, i: number) => {
    switch (b.type) {
      case "h1":
        return <Text key={i} style={sx.h1}>{b.text}</Text>;
      case "h2":
        return <Text key={i} style={sx.h2}>{b.text}</Text>;
      case "h3":
        return <Text key={i} style={sx.h3}>{b.text}</Text>;
      case "p":
        return <Text key={i} style={sx.p}>{b.text}</Text>;
      case "quote":
        return <Text key={i} style={sx.quote}>{b.text}</Text>;
      case "quadro":
        return (
          <View key={i} style={sx.quadro}>
            {b.title ? <Text style={sx.quadroTitle}>{b.title}</Text> : null}
            <Text>{b.text}</Text>
          </View>
        );
      case "timeline":
        return (
          <View key={i} style={{ marginVertical: sizes.gap }}>
            {b.items.map((it, k) => (
              <View key={k} style={sx.timelineItem}>
                <View style={sx.timelineDot} />
                <Text style={{ flex: 1 }}>
                  {it.when ? <Text style={sx.timelineWhen}>{it.when} </Text> : null}
                  {it.what}
                </Text>
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <Document title={title} author={authorOrCase ?? undefined}>
      {showCapa && (
        <Page size="A4" style={sx.page}>
          <View style={sx.coverWrap}>
            <View style={sx.coverBar} />
            <Text style={sx.coverTitle}>{title}</Text>
            {authorOrCase ? <Text style={sx.coverSub}>{authorOrCase}</Text> : null}
          </View>
        </Page>
      )}
      <Page size="A4" style={sx.page}>
        <View style={sx.headerStrip} />
        {blocks.map(renderBlock)}
        {showNum && (
          <View style={sx.footer} fixed>
            <Text>{title}</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        )}
      </Page>
    </Document>
  );
}