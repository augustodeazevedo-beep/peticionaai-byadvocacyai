import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { BrandLockup } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, FileText, ShieldCheck, Workflow, BookOpen, Brain, ExternalLink } from "lucide-react";
import heroBg from "@/assets/hero-background.jpg";
import { ECOSYSTEM_APPS } from "@/lib/ecosystem";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Peticiona.AI — Redação assistida de peças jurídicas" },
      { name: "description", content: "Plataforma AI-Native para redação técnica de petições, com fundamentação, anti-alucinação e exportação ABNT. Por Advocacy.AI." },
      { property: "og:title", content: "Peticiona.AI — Redação assistida de peças jurídicas" },
      { property: "og:description", content: "Wizard guiado, persona jurídica sênior e exportação .docx em padrão ABNT." },
      { property: "og:url", content: "https://peticionaai-byadvocacyai.lovable.app/" },
      { name: "twitter:title", content: "Peticiona.AI — Redação assistida de peças jurídicas" },
      { name: "twitter:description", content: "Wizard guiado, persona jurídica sênior e exportação .docx em padrão ABNT." },
    ],
    links: [{ rel: "canonical", href: "https://peticionaai-byadvocacyai.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Peticiona.AI",
              url: "https://peticionaai-byadvocacyai.lovable.app/",
              logo: "https://peticionaai-byadvocacyai.lovable.app/favicon.png",
              parentOrganization: { "@type": "Organization", name: "Advocacy.AI" },
            },
            {
              "@type": "WebSite",
              name: "Peticiona.AI",
              url: "https://peticionaai-byadvocacyai.lovable.app/",
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay para contraste e fade nas bordas */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.65) 55%, hsl(var(--background)) 100%)",
            }}
          />
          {/* Fade suave para a próxima seção */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />

          <div className="relative container mx-auto px-4 py-20 md:py-32 text-center min-h-[80vh] flex flex-col items-center justify-center">
            <div className="flex justify-center mb-8">
              <BrandLockup size="xl" variant="stacked" glow />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-Native · by Advocacy.AI
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
              Redija peças jurídicas <br />
              <span className="text-gradient-brand">com inteligência</span>, não com mágica.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Wizard guiado, persona jurídica sênior, regras anti-alucinação e exportação ABNT —
              tudo dentro de uma plataforma feita para advogados brasileiros.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="bg-gradient-brand text-primary-foreground" asChild>
                <Link to="/signup">
                  Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-center text-3xl font-bold mb-12">Como funciona</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Workflow, title: "1. Briefing guiado", desc: "Wizard estruturado coleta partes, fatos, fundamentos e pedidos sem deixar lacunas." },
              { icon: Brain, title: "2. Geração com IA", desc: "Persona jurídica sênior produz a peça com regras anti-alucinação e shadow cabinet." },
              { icon: FileText, title: "3. Editor + .docx", desc: "Refina no editor, gera checklist final e exporta em ABNT pronto para protocolar." },
            ].map((s) => (
              <Card key={s.title} className="glass p-6 border-border/50">
                <s.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Diferenciais */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Anti-alucinação", desc: "Não inventa jurisprudência nem assume fatos. Sinaliza pendências para revisão." },
              { icon: BookOpen, title: "Padrão ABNT", desc: "Formatação Arial 12, espaçamento 1,5, citações conforme NBR 10520:2023." },
              { icon: Sparkles, title: "Ecossistema Advocacy.AI", desc: "Conversa com Advocase.AI, Advoga.AI, Inventaria.AI, Fin.AI e Study.AI — da captação ao financeiro." },
            ].map((s) => (
              <Card key={s.title} className="glass p-6 border-border/50">
                <s.icon className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Ecossistema */}
        <section className="container mx-auto px-4 py-20">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center rounded-full border border-primary/40 px-4 py-1 text-[10px] uppercase tracking-[0.25em] text-primary font-mono">
              Ecossistema Advocacy<span className="text-gradient-brand">.AI</span>
            </span>
          </div>
          <h2 className="text-center text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Uma marca. Seis cérebros.<br />Um só ecossistema.
          </h2>
          <p className="text-center text-muted-foreground max-w-3xl mx-auto mb-12">
            A <strong className="text-foreground">Advocacy.AI</strong> é o Legal AI Lab que projeta, opera e evolui uma suíte AI-Native de produtos jurídicos — cada um especializado em um eixo crítico da advocacia moderna: <strong className="text-foreground">captação, gestão, documentos, patrimônio, finanças e estudo</strong>. Diferentes funções, mesma identidade visual e mesma inteligência conectada.
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM_APPS.map((app) => {
              const Icon = app.icon;
              const inner = (
                <Card
                  className={`relative h-full p-6 transition-all ${
                    app.current
                      ? "border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_0_40px_-10px_hsl(var(--primary)/0.5)]"
                      : "glass border-border/50 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary/60 border border-border/50">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary font-mono">
                      {app.category}
                      {!app.current && <ExternalLink className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                  <div className="text-xl font-semibold tracking-tight">
                    {app.name.replace(/\.AI$/, "")}
                    <span className="font-mono text-gradient-brand">.AI</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{app.tagline}</p>
                  {app.current && (
                    <span className="mt-5 inline-flex items-center rounded-full border border-primary/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary font-mono">
                      Você está aqui
                    </span>
                  )}
                </Card>
              );
              return app.current ? (
                <div key={app.id}>{inner}</div>
              ) : (
                <a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer" className="block">
                  {inner}
                </a>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Card className="glass max-w-3xl mx-auto p-12 border-border/50">
            <h2 className="text-3xl font-bold mb-4">Pronto para deixar a redação com a IA?</h2>
            <p className="text-muted-foreground mb-8">Crie sua conta em segundos e produza sua primeira peça hoje.</p>
            <Button size="lg" className="bg-gradient-brand text-primary-foreground" asChild>
              <Link to="/signup">
                Criar conta gratuita <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
