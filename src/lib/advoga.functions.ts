import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ADVOGA_KEYS,
  DEFAULT_OUTBOUND_URL,
  postDocumentToAdvoga,
  readAdvogaConfig,
  writeAdvogaSetting,
  type AdvogaSettings,
} from "./advoga.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export const getAdvogaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { origin: string }) => z.object({ origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg: AdvogaSettings = await readAdvogaConfig(data.origin);
    return cfg;
  });

const SaveSchema = z.object({
  outbound_url: z.string().url().max(500).optional(),
  outbound_secret: z.string().min(8).max(255).optional().nullable(),
  inbound_secret: z.string().min(8).max(255).optional().nullable(),
  auto_send: z.boolean().optional(),
});

export const saveAdvogaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.outbound_url !== undefined) {
      await writeAdvogaSetting(
        ADVOGA_KEYS.outboundUrl,
        data.outbound_url || DEFAULT_OUTBOUND_URL,
        false,
        context.userId,
      );
    }
    if (data.outbound_secret !== undefined && data.outbound_secret !== null && data.outbound_secret !== "") {
      await writeAdvogaSetting(
        ADVOGA_KEYS.outboundSecret,
        data.outbound_secret,
        true,
        context.userId,
      );
    }
    if (data.inbound_secret !== undefined && data.inbound_secret !== null && data.inbound_secret !== "") {
      await writeAdvogaSetting(
        ADVOGA_KEYS.inboundSecret,
        data.inbound_secret,
        true,
        context.userId,
      );
    }
    if (data.auto_send !== undefined) {
      await writeAdvogaSetting(
        ADVOGA_KEYS.autoSend,
        data.auto_send ? "true" : "false",
        false,
        context.userId,
      );
    }
    return { ok: true };
  });

export const pingAdvoga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const r = await postDocumentToAdvoga(
        {
          document_url: "https://example.invalid/peticione-ping.pdf",
          document_type: "ping",
          external_id: `ping:${Date.now()}`,
        },
        context.userId,
      );
      return { ok: r.ok, status: r.status, body: r.body.slice(0, 500) };
    } catch (err) {
      return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
    }
  });

const SendDocSchema = z.object({
  pieceId: z.string().uuid(),
});

export const sendPieceToAdvoga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendDocSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Get latest visual version (PDF) for this piece, owned by this user
    const { data: piece, error: pieceErr } = await supabase
      .from("pieces")
      .select("id, piece_type, project_id, title")
      .eq("id", data.pieceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (pieceErr) throw new Error(pieceErr.message);
    if (!piece) throw new Error("Peça não encontrada.");

    const { data: ver } = await (supabase as any)
      .from("piece_visual_versions")
      .select("id, pdf_storage_path")
      .eq("piece_id", data.pieceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ver?.pdf_storage_path) {
      throw new Error("Gere o PDF de Visual Law antes de enviar.");
    }

    // Fresh signed URL via admin client (avoids RLS/edge cases)
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("piece-exports")
      .createSignedUrl(ver.pdf_storage_path, 60 * 60 * 24);
    if (signErr || !signed?.signedUrl) {
      throw new Error("Falha ao gerar URL temporária do PDF.");
    }

    let cnj: string | null = null;
    if (piece.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("cnj_number")
        .eq("id", piece.project_id)
        .maybeSingle();
      cnj = proj?.cnj_number ?? null;
    }

    const r = await postDocumentToAdvoga(
      {
        numero_cnj: cnj,
        document_url: signed.signedUrl,
        document_type: piece.piece_type ?? "peca",
        external_id: `peticione:${piece.id}`,
      },
      userId,
    );
    return { ok: r.ok, status: r.status };
  });