import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { resolveBrandAssetUrl, type OfficeBrand } from "@/lib/officeBrand";

/**
 * Simula uma folha A4 com o papel timbrado do escritório, para que o usuário
 * veja como a peça ficará no PDF/DOCX antes de exportar.
 */
export function PageMockup({
  content,
  brand,
}: {
  content: string;
  brand: OfficeBrand | null;
}) {
  const primary = brand?.primary_color ?? "#283753";
  const font = brand?.font_family ?? "Arial";
  const showLetterhead = brand?.letterhead_enabled ?? false;
  const layout = brand?.letterhead_layout ?? "topo";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveBrandAssetUrl(brand?.logo_url).then((u) => {
      if (!cancelled) setLogoUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [brand?.logo_url]);

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto my-4 bg-white text-black shadow-2xl"
        style={{
          width: "21cm",
          minHeight: "29.7cm",
          fontFamily: font,
          padding: "3cm 2cm 2cm 3cm",
          position: "relative",
        }}
      >
        {showLetterhead && (layout === "topo" || layout === "minimal") && (
          <header
            className="flex items-center gap-4 pb-3 mb-6"
            style={{ borderBottom: `2px solid ${primary}` }}
          >
            {logoUrl && (
              <img src={logoUrl} alt="" style={{ maxHeight: 60, maxWidth: 120, objectFit: "contain" }} />
            )}
            {layout === "topo" && (
              <div className="text-xs leading-tight" style={{ color: primary }}>
                <div className="font-bold text-sm">{brand?.firm_name}</div>
                {brand?.address && <div>{brand.address}</div>}
                <div className="text-[10px] opacity-80">
                  {[brand?.phone, brand?.email, brand?.website].filter(Boolean).join(" · ")}
                </div>
              </div>
            )}
          </header>
        )}

        {showLetterhead && layout === "lateral" && (
          <aside
            className="absolute top-[3cm] left-[1cm] text-[10px] leading-tight w-[2cm]"
            style={{ color: primary }}
          >
            {logoUrl && (
              <img src={logoUrl} alt="" className="mb-2" style={{ maxWidth: "1.8cm", objectFit: "contain" }} />
            )}
            <div className="font-bold">{brand?.firm_name}</div>
            {brand?.address && <div>{brand.address}</div>}
            {brand?.phone && <div>{brand.phone}</div>}
            {brand?.email && <div className="break-words">{brand.email}</div>}
          </aside>
        )}

        <article
          className="prose max-w-none"
          style={{
            ["--tw-prose-headings" as string]: primary,
            fontSize: "12pt",
            lineHeight: 1.5,
            textAlign: "justify",
            color: "#111",
          }}
        >
          <style>{`
            .a4-prose p { text-indent: 2.5cm; margin: 0 0 0.5em 0; }
            .a4-prose h1, .a4-prose h2, .a4-prose h3 { color: ${primary}; font-weight: 700; }
            .a4-prose h1 { text-align: center; font-size: 14pt; margin: 1em 0; text-transform: uppercase; }
            .a4-prose h2 { font-size: 13pt; margin-top: 1em; }
            .a4-prose h3 { font-size: 12pt; margin-top: 0.8em; }
            .a4-prose blockquote { margin-left: 4cm; font-size: 10pt; line-height: 1.2; border: none; font-style: normal; }
          `}</style>
          <div className="a4-prose">
            <ReactMarkdown>{content || "_Sem conteúdo._"}</ReactMarkdown>
          </div>
        </article>

        {showLetterhead && (
          <footer
            className="absolute bottom-[1cm] left-[3cm] right-[2cm] text-[9px] flex justify-between"
            style={{ color: primary, borderTop: `1px solid ${primary}33`, paddingTop: 4 }}
          >
            <span>{brand?.firm_name}</span>
            <span>{[brand?.phone, brand?.email].filter(Boolean).join(" · ")}</span>
          </footer>
        )}
      </div>
    </div>
  );
}