import { BrandMark } from "./Logo";
import advocacyIcon from "@/assets/advocacy-ai-icon.png";

export function AppFooter() {
  return (
    <footer className="border-t border-border/50 mt-20">
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BrandMark size={20} />
          <p>© {new Date().getFullYear()} Peticiona.AI — Redação assistida por IA.</p>
        </div>
        <p className="flex items-center gap-2">
          <img src={advocacyIcon} alt="Advocacy.AI" className="h-5 w-auto" />
          <span>
            by <span className="text-gradient-brand font-semibold">Advocacy.AI</span> · Prospect.AI · Advoga.AI · Peticiona.AI · Fin.AI
          </span>
        </p>
      </div>
    </footer>
  );
}