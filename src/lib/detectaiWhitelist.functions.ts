import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuditCategory, AuditFinding } from "@/lib/audit/types";

export type WhitelistScope = "text" | "regex" | "citation";

export type WhitelistEntry = {
  id: string;
  user_id: string;
  client_name: string | null;
  scope: WhitelistScope;
  pattern: string;
  category: AuditCategory | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const WHITELIST_CATEGORIES: AuditCategory[] = [
  "prompt_injection",
  "jailbreak",
  "fake_citation",
  "fake_jurisprudence",
  "hallucination",
  "pii_leak",
];

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  client_name: z.string().trim().max(200).optional().nullable(),
  scope: z.enum(["text", "regex", "citation"]),
  pattern: z.string().trim().min(1).max(500),
  category: z
    .enum([
      "prompt_injection",
      "jailbreak",
      "fake_citation",
      "fake_jurisprudence",
      "hallucination",
      "pii_leak",
    ])
    .optional()
    .nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const listDetectAiWhitelist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhitelistEntry[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("detectai_whitelist")
      .select("*")
      .eq("user_id", userId)
      .order("client_name", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as WhitelistEntry[];
  });

export const saveDetectAiWhitelist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertInput.parse(d))
  .handler(async ({ data, context }): Promise<WhitelistEntry> => {
    const { supabase, userId } = context;
    if (data.scope === "regex") {
      try {
        new RegExp(data.pattern);
      } catch {
        throw new Error("Regex inválida");
      }
    }
    const payload = {
      user_id: userId,
      client_name: data.client_name?.trim() || null,
      scope: data.scope,
      pattern: data.pattern,
      category: data.category ?? null,
      notes: data.notes?.trim() || null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("detectai_whitelist")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as WhitelistEntry;
    }
    const { data: row, error } = await supabase
      .from("detectai_whitelist")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as WhitelistEntry;
  });

export const deleteDetectAiWhitelist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("detectai_whitelist")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Filtra findings suprimindo os que casam com entradas de whitelist aplicáveis ao cliente. */
export function applyWhitelistToFindings(
  findings: AuditFinding[],
  entries: WhitelistEntry[],
  clientName: string | null,
): AuditFinding[] {
  if (!entries.length) return findings;
  const client = clientName ? normalize(clientName) : null;
  const applicable = entries.filter((e) => {
    if (!e.client_name) return true;
    if (!client) return false;
    return normalize(e.client_name) === client;
  });
  if (!applicable.length) return findings;
  return findings.filter((f) => !applicable.some((e) => matches(e, f)));
}

function matches(entry: WhitelistEntry, f: AuditFinding): boolean {
  if (entry.category && entry.category !== f.category) return false;
  const snippet = f.snippet ?? "";
  const evidenceId = f.evidence?.matched_id ?? "";
  if (entry.scope === "regex") {
    try {
      const re = new RegExp(entry.pattern, "i");
      return re.test(snippet) || (!!evidenceId && re.test(evidenceId));
    } catch {
      return false;
    }
  }
  if (entry.scope === "citation") {
    const p = normalize(entry.pattern);
    return normalize(evidenceId).includes(p) || normalize(snippet).includes(p);
  }
  return normalize(snippet).includes(normalize(entry.pattern));
}

/** Carrega as entradas de whitelist do usuário. */
export async function loadWhitelist(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<WhitelistEntry[]> {
  const { data } = await supabase
    .from("detectai_whitelist")
    .select("*")
    .eq("user_id", userId);
  return (data ?? []) as WhitelistEntry[];
}
