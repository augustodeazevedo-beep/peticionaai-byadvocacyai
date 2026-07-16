import { createFileRoute } from "@tanstack/react-router";
import { TutorialHero } from "@/components/tutorial/TutorialHero";
import { TutorialSidebar } from "@/components/tutorial/TutorialSidebar";
import { TutorialSection } from "@/components/tutorial/TutorialSection";
import { TUTORIAL_SECTIONS } from "@/lib/tutorialSections";

export const Route = createFileRoute("/_authenticated/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial — Peticiona.AI" },
      {
        name: "description",
        content:
          "Aprenda como o Peticiona.AI funciona: pipeline cognitivo, criação de peças, Detect.AI, modelos, identidade do escritório e integrações.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorialPage,
});

function TutorialPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <TutorialHero />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <TutorialSidebar sections={TUTORIAL_SECTIONS} />
        </aside>

        <div className="space-y-4">
          {TUTORIAL_SECTIONS.map((section, i) => (
            <TutorialSection key={section.id} section={section} index={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}