import { supabase } from "@/integrations/supabase/client";
import { useVisualLawStore } from "@/stores/visualLaw";
import { persistVersion } from "@/services/visual-law/versions";
import type {
  VLGeneratePayload,
  VLLegalValidation,
  VLRiskAnalysis,
} from "@/types/visual-law";

export interface StreamFinalPayload {
  content: string;
  validation?: VLLegalValidation;
  risk?: VLRiskAnalysis;
}

export interface StreamHandlers {
  onToken: (chunk: string) => void;
  onDone: (final: StreamFinalPayload) => void;
  onError: (err: Error) => void;
}

const FUNCTION_PATH = "/functions/v1/generate-visual-law";

function endpoint(): string {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("VITE_SUPABASE_URL não configurada.");
  return `${base}${FUNCTION_PATH}`;
}

export async function streamVisualLaw(
  payload: VLGeneratePayload,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(endpoint(), {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(apikey ? { apikey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok || !resp.body) {
      let msg = "Falha ao iniciar streaming.";
      try {
        const j = await resp.json();
        if (j?.error) msg = j.error;
      } catch { /* ignore */ }
      if (resp.status === 429) msg = "Muitas requisições. Aguarde alguns segundos e tente novamente.";
      if (resp.status === 402) msg = "Créditos do Lovable AI esgotados. Adicione créditos no Workspace.";
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let aggregated = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, nl);
        textBuffer = textBuffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);
          const content: string | undefined = parsed.choices?.[0]?.delta?.content;
          if (content) {
            aggregated += content;
            handlers.onToken(content);
          }
        } catch {
          // JSON parcial entre chunks: devolve a linha ao buffer e aguarda mais dados
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush final
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content: string | undefined = parsed.choices?.[0]?.delta?.content;
          if (content) { aggregated += content; handlers.onToken(content); }
        } catch { /* ignore */ }
      }
    }

    handlers.onDone({ content: aggregated });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return;
    handlers.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Orquestrador alto-nível: conecta o stream à store Zustand.
 * UI da Etapa 3 só precisa montar o payload e chamar runGeneration().
 */
export async function runGeneration(
  payload: VLGeneratePayload,
  opts?: { pieceId?: string; userId?: string },
): Promise<void> {
  const controller = new AbortController();
  const store = useVisualLawStore.getState();
  // Garante que o conteúdo base esteja sincronizado antes do append
  if (payload.currentContent && store.documentContent !== payload.currentContent) {
    // Não usamos initFromPiece aqui (preserva versions); apenas reflete no buffer
    useVisualLawStore.setState({ documentContent: payload.currentContent });
  }
  // Limpa documentContent para receber o novo stream "do zero"
  useVisualLawStore.setState({ documentContent: "" });
  store.startGeneration(controller);

  await streamVisualLaw(
    payload,
    {
      onToken: (chunk) => useVisualLawStore.getState().appendToken(chunk),
      onDone: ({ content, validation, risk }) => {
        const finalContent = content || useVisualLawStore.getState().streamBuffer;
        useVisualLawStore.getState().finishGeneration({
          content: finalContent,
          config: payload.config,
          prompt: payload.refinementPrompt,
          direction: payload.direction,
          legalMetadata: payload.legalMetadata,
          validation,
          risk,
        });
        // Background persistence — não bloqueia a UI
        if (opts?.pieceId && opts?.userId) {
          const last = useVisualLawStore.getState().versions.slice(-1)[0];
          if (last) {
            void persistVersion(opts.pieceId, opts.userId, last)
              .then((saved) => {
                useVisualLawStore.getState().replaceLastVersionMeta(saved.id, saved.timestamp);
              })
              .catch(() => {
                // versão local segue válida; UI mostra erro se quiser via toast no caller
              });
          }
        }
      },
      onError: (err) => useVisualLawStore.getState().failGeneration(err.message),
    },
    controller.signal,
  );
}