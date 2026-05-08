import icon from "@/assets/peticione-icon.png";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Peticione.AI — Brand System
 *
 * Marca oficial: símbolo (pena estilizada com nós neurais cyan→violeta)
 * + wordmark tipográfico (Inter 600 + JetBrains Mono ".AI" com gradiente).
 *
 * Diretrizes:
 * - Espaçamento mínimo ao redor do símbolo: ½ da sua altura.
 * - Tamanho mínimo do símbolo: 24px.
 * - Nunca distorcer, recolorir, rotacionar ou contornar.
 */

type Tone = "dark" | "light";
type Size = "sm" | "md" | "lg" | "xl";

const SYMBOL_PX: Record<Size, number> = { sm: 24, md: 36, lg: 56, xl: 88 };
const WORDMARK_TEXT_CLASS: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-5xl md:text-6xl",
};

export function BrandMark({
  size = 32,
  className,
  glow = false,
}: { size?: number; className?: string; glow?: boolean }) {
  return (
    <img
      src={icon}
      alt="Peticione.AI"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      className={cn(glow && "drop-shadow-[0_0_24px_rgba(56,189,248,0.45)]", className)}
    />
  );
}

export function BrandWordmark({
  size = "md",
  tone = "dark",
  className,
}: { size?: Size; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight leading-none whitespace-nowrap",
        WORDMARK_TEXT_CLASS[size],
        className,
      )}
    >
      <span className={tone === "dark" ? "text-foreground" : "text-background"}>Peticione</span>
      <span className="font-mono text-gradient-brand">.AI</span>
    </span>
  );
}

export function BrandLockup({
  size = "md",
  variant = "horizontal",
  tone = "dark",
  glow = false,
  asLink = false,
  className,
}: {
  size?: Size;
  variant?: "horizontal" | "stacked";
  tone?: Tone;
  glow?: boolean;
  asLink?: boolean;
  className?: string;
}) {
  const symbol = SYMBOL_PX[size];
  const content = (
    <span
      className={cn(
        "inline-flex items-center",
        variant === "stacked" ? "flex-col gap-3" : "flex-row gap-3",
        className,
      )}
    >
      <BrandMark size={symbol} glow={glow} />
      <BrandWordmark size={size} tone={tone} />
    </span>
  );
  if (asLink) {
    return (
      <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}

// ---- Backwards-compat aliases (deprecated) ----
/** @deprecated use BrandMark */
export const LogoMark = ({ size = 32 }: { size?: number }) => <BrandMark size={size} />;
/** @deprecated use BrandLockup */
export const LogoFull = ({ className }: { className?: string }) => (
  <BrandLockup size="xl" variant="stacked" glow className={className} />
);
/** @deprecated use BrandLockup asLink */
export const Logo = () => <BrandLockup asLink size="md" />;
