import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { BrandLockup } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, FileText, ShieldCheck, Workflow, BookOpen, Brain } from "lucide-react";
import heroBg from "@/assets/hero-background.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Peticiona.AI — Redação assistida de peças jurídicas" },
      { name: "description", content: "Plataforma AI-Native para redação técnica de petições, com fundamentação, anti-alucinação e exportação ABNT. Por Advocacy.AI." },
      { property: "og:title", content: "Peticiona.AI — Redação assistida de peças jurídicas" },
      { property: "og:description", content: "Wizard guiado, persona jurídica sênior e exportação .docx em padrão ABNT." },
    ],
    links: [{ rel: "canonical", href: "/" }],
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
              { icon: Sparkles, title: "Ecossistema Advocacy.AI", desc: "Conversa com Prospect.AI, Advoga.AI e Fin.AI — do prospect ao financeiro." },
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
          <h2 className="text-center text-3xl font-bold mb-3">O ecossistema Advocacy.AI</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            Quatro plataformas que se conversam para cobrir todo o ciclo do escritório moderno.
          </p>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { name: "Prospect.AI", desc: "Captação inteligente de clientes." },
              { name: "Advoga.AI", desc: "Gestão completa do escritório." },
              { name: "Peticiona.AI", desc: "Redação assistida de peças.", current: true },
              { name: "Fin.AI", desc: "Financeiro e cobrança." },
            ].map((p) => (
              <Card key={p.name} className={`p-5 ${p.current ? "border-primary/50 bg-primary/5" : "glass border-border/50"}`}>
                <div className="text-sm font-mono text-gradient-brand">{p.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                {p.current && <div className="mt-3 text-xs text-primary">Você está aqui</div>}
              </Card>
            ))}
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
