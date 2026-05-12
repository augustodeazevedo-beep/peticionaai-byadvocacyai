import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadVersions } from "@/services/visual-law/versions";
import { useVisualLawStore } from "@/stores/visualLaw";

export function useLoadVersions(pieceId: string) {
  const hydrate = useVisualLawStore((s) => s.hydrateVersions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadVersions(pieceId)
      .then((versions) => {
        if (!alive) return;
        hydrate(versions);
      })
      .catch(() => {
        if (!alive) return;
        toast.error("Falha ao carregar versões salvas");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pieceId, hydrate]);

  return { loading };
}