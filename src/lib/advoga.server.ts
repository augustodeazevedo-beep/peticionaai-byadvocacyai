// Server-only helpers for Advoga.AI integration.
// Reads/writes settings in `system_settings` and posts to the Advoga webhook.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADVOGA_KEYS = {
  outboundUrl: "advoga_outbound_url",
  outboundSecret: "advoga_outbound_secret",
  inboundSecret: "advoga_inbound_secret",
  autoSend: "advoga_auto_send",
} as const;

export const DEFAULT_OUTBOUND_URL =
  "https://advogaai-byadvocacy.lovable.app/api/public/peticione-document-generated";

export type AdvogaSettings = {
  outbound_url: string;
  outbound_secret_set: boolean;
  inbound_secret_set: boolean;
  auto_send: boolean;
  inbound_url: string;
};

async function readSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as string | null) ?? null;
}

export async function readAdvogaConfig(siteOrigin: string): Promise<AdvogaSettings> {
  const [outboundUrl, outboundSecret, inboundSecret, autoSend] = await Promise.all([
    readSetting(ADVOGA_KEYS.outboundUrl),
    readSetting(ADVOGA_KEYS.outboundSecret),
    readSetting(ADVOGA_KEYS.inboundSecret),
    readSetting(ADVOGA_KEYS.autoSend),
  ]);
  return {
    outbound_url: outboundUrl ?? DEFAULT_OUTBOUND_URL,
    outbound_secret_set: !!outboundSecret,
    inbound_secret_set: !!inboundSecret,
    auto_send: autoSend === "true",
    inbound_url: `${siteOrigin.replace(/\/$/, "")}/api/public/advoga-process-context`,
  };
}

export async function writeAdvogaSetting(
  key: string,
  value: string | null,
  isSecret: boolean,
  updatedBy?: string,
) {
  const payload: Record<string, unknown> = {
    key,
    value,
    is_secret: isSecret,
    updated_at: new Date().toISOString(),
  };
  if (updatedBy) payload.updated_by = updatedBy;
  const { error } = await supabaseAdmin
    .from("system_settings")
    .upsert(payload, { onConflict: "key" });
  if (error) throw error;
}

export async function getOutboundConfig(): Promise<{ url: string; secret: string | null }> {
  const [url, secret] = await Promise.all([
    readSetting(ADVOGA_KEYS.outboundUrl),
    readSetting(ADVOGA_KEYS.outboundSecret),
  ]);
  return { url: url ?? DEFAULT_OUTBOUND_URL, secret };
}

export async function getInboundSecret(): Promise<string | null> {
  return readSetting(ADVOGA_KEYS.inboundSecret);
}

export async function logIntegration(entry: {
  integration: "advoga_outbound" | "advoga_inbound";
  endpoint: string;
  status_code: number | null;
  ok: boolean;
  duration_ms: number;
  user_id?: string | null;
  request_summary?: string | null;
  response_summary?: string | null;
  error?: string | null;
}) {
  await supabaseAdmin.from("integration_logs").insert({
    integration: entry.integration,
    endpoint: entry.endpoint,
    status_code: entry.status_code,
    ok: entry.ok,
    duration_ms: entry.duration_ms,
    user_id: entry.user_id ?? null,
    request_summary: entry.request_summary?.slice(0, 2000) ?? null,
    response_summary: entry.response_summary?.slice(0, 2000) ?? null,
    error: entry.error?.slice(0, 2000) ?? null,
  });
}

export type AdvogaDocumentPayload = {
  processo_id?: string | null;
  numero_cnj?: string | null;
  document_url: string;
  document_type: string;
  external_id?: string | null;
};

export async function postDocumentToAdvoga(
  payload: AdvogaDocumentPayload,
  userId?: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const { url, secret } = await getOutboundConfig();
  if (!secret) {
    throw new Error("Secret de saída para Advoga.AI não configurado.");
  }
  const started = Date.now();
  let status = 0;
  let bodyText = "";
  let ok = false;
  let errorMsg: string | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(payload),
    });
    status = res.status;
    bodyText = await res.text();
    ok = res.ok;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }
  await logIntegration({
    integration: "advoga_outbound",
    endpoint: url,
    status_code: status || null,
    ok,
    duration_ms: Date.now() - started,
    user_id: userId,
    request_summary: JSON.stringify({
      document_type: payload.document_type,
      external_id: payload.external_id,
      numero_cnj: payload.numero_cnj,
    }),
    response_summary: bodyText,
    error: errorMsg,
  });
  if (errorMsg) throw new Error(errorMsg);
  return { ok, status, body: bodyText };
}