import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisualLawStore } from "@/stores/visualLaw";

export function GenerationOverlay() {
  const isGenerating = useVisualLawStore((s) => s.isGenerating);
  const buffer = useVisualLawStore((s) => s.streamBuffer);
  const cancel = useVisualLawStore((s) => s.cancelGeneration);
  const [mounted, setMounted] = useState(false);
  const peakRef = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isGenerating) peakRef.current = 0;
  }, [isGenerating]);

  const pct = useMemo(() => {
    if (!isGenerating) return 0;
    // Heurística: caracteres recebidos vs. crescimento esperado (~6000 chars)
    // Curva logarítmica suave, cap em 95%.
    const target = 6000;
    const raw = Math.min(95, Math.round((1 - Math.exp(-buffer.length / target)) * 100));
    if (raw > peakRef.current) peakRef.current = raw;
    return peakRef.current;
  }, [buffer.length, isGenerating]);

  if (!mounted || !isGenerating) return null;

  const size = 140;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const node = (
    <div
      role="dialog"
      aria-busy="true"
      aria-label="Analisando documento"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in"
    >
      <div className="relative flex flex-col items-center gap-6 rounded-2xl border border-border/50 bg-card/80 px-12 py-10 shadow-2xl">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              fill="none"
              opacity={0.3}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              fill="none"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold text-foreground">Analisando documento…</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Pode levar até 3 minutos
          </p>
          <p className="pt-2 text-xs text-muted-foreground tabular-nums">
            {buffer.length.toLocaleString("pt-BR")} caracteres recebidos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cancel} className="gap-2">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
        <p className="max-w-xs text-center text-[10px] text-muted-foreground/70">
          Visual Law AI é um experimento de raciocínio jurídico assistido — revise sempre o conteúdo gerado.
        </p>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}