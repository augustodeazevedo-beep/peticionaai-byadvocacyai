import { supabase } from "@/integrations/supabase/client";

export type GenerateInput = {
  piece_type: string;
  area?: string;
  fields: Record<string, unknown>;
  context?: string;
};

export type GenerateResult = {
  content: string;
  model_used: string;
  source: "mike" | "lovable_ai";
};

export async function generatePiece(input: GenerateInput): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke("mike-generate", { body: input });
  if (error) throw error;
  return data as GenerateResult;
}

/* ===========================================================
 * Pipeline cognitivo (SSE)
 * =========================================================== */

export type CognitiveStep = "cognitive" | "adversarial" | "draft" | "audit";

export type CognitiveInput = GenerateInput & {
  party_position?: string;
  tribunal?: string;
  instancia?: string;
  rito?: string;
  fase_processual?: string;
  piece_id?: string;
  workspace_id?: string;
};

export type CognitiveResult = {
  content: string;
  model_used: string;
  intelligence: {
    cognitive?: Record<string, unknown>;
    adversarial?: Record<string, unknown>;
    audit?: Record<string, unknown>;
  };
};

type CognitiveEvents = {
  onStepStart?: (step: CognitiveStep) => void;
  onStepDone?: (step: CognitiveStep, data: unknown, degraded?: boolean) => void;
  onDelta?: (text: string) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

export async function generatePieceCognitive(
  input: CognitiveInput,
  events: CognitiveEvents = {},
): Promise<CognitiveResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const supabaseUrl =
    (supabase as unknown as { supabaseUrl: string }).supabaseUrl ??
    import.meta.env.VITE_SUPABASE_URL;

  const resp = await fetch(`${supabaseUrl}/functions/v1/mike-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...input, pipeline: "cognitive" }),
    signal: events.signal,
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text();
    throw new Error(`Falha no pipeline (${resp.status}): ${text || resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let modelUsed = "";
  const intelligence: CognitiveResult["intelligence"] = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sepIdx: number;
    while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, sepIdx);
      buf = buf.slice(sepIdx + 2);
      const lines = block.split("\n");
      let event = "message";
      const dataParts: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataParts.push(line.slice(6));
      }
      if (!dataParts.length) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(dataParts.join("\n"));
      } catch {
        continue;
      }
      const p = payload as Record<string, unknown>;
      if (event === "step_start") {
        events.onStepStart?.(p.step as CognitiveStep);
      } else if (event === "step_done") {
        const step = p.step as CognitiveStep;
        if (step === "cognitive") intelligence.cognitive = p.data as Record<string, unknown>;
        else if (step === "adversarial")
          intelligence.adversarial = p.data as Record<string, unknown>;
        else if (step === "audit") intelligence.audit = p.data as Record<string, unknown>;
        events.onStepDone?.(step, p.data, Boolean(p.degraded));
      } else if (event === "delta") {
        const text = (p.text as string) ?? "";
        content += text;
        events.onDelta?.(text);
      } else if (event === "done") {
        content = (p.content as string) ?? content;
        modelUsed = (p.model_used as string) ?? modelUsed;
        if (p.intelligence) Object.assign(intelligence, p.intelligence);
      } else if (event === "error") {
        const msg = (p.message as string) ?? "Erro desconhecido";
        events.onError?.(msg);
        throw new Error(msg);
      }
    }
  }

  return { content, model_used: modelUsed, intelligence };
}

export type ExportResult = { url: string; path: string };

export async function exportPieceDocx(piece_id: string): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke("export-piece-docx", { body: { piece_id } });
  if (error) throw error;
  return data as ExportResult;
}

/**
 * Calls the export-document edge function and returns the raw HTML blob
 * as an object URL that can be used to trigger a browser file download.
 */
export async function exportPieceHtml(piece_id: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
    ?? import.meta.env.VITE_SUPABASE_URL;

  const res = await fetch(`${supabaseUrl}/functions/v1/export-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ piece_id }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao exportar HTML: ${res.status} ${text}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "peticao.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
