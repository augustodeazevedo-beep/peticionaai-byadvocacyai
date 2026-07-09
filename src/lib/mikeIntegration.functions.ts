import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  endpoint: z.string().trim().url().max(500),
  model: z.string().trim().max(200).optional().nullable(),
  monthly_token_cap: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
  is_active: z.boolean(),
  api_key: z.string().trim().max(500).optional().nullable(),
});

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  // Accept either a 64-char hex string (32 bytes) or any string -> SHA-256 hash.
  let raw: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    raw = hexToBytes(secret);
  } else {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    raw = new Uint8Array(hash);
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(plain: string): Promise<string> {
  const secret = process.env.MIKE_KEY_ENC_SECRET;
  if (!secret) throw new Error("MIKE_KEY_ENC_SECRET não configurada no servidor.");
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `enc:v1:${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`;
}

export const saveMikeIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const base: Record<string, unknown> = {
      user_id: userId,
      provider: "mike",
      endpoint: data.endpoint,
      model: data.model?.trim() || null,
      monthly_token_cap: data.monthly_token_cap ?? null,
      is_active: data.is_active,
    };
    if (data.api_key && data.api_key.trim()) {
      base.api_key_encrypted = await encryptApiKey(data.api_key.trim());
    }
    const { error } = await supabase
      .from("user_integrations")
      .upsert(base, { onConflict: "user_id,provider" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });