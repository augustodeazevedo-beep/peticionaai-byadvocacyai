import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  INVENTARIA_KEYS,
  DEFAULT_OUTBOUND_URL,
  postDocumentToInventaria,
  readInventariaConfig,
  writeInventariaSetting,
  type InventariaSettings,
} from "./inventaria.server";

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

export const getInventariaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { origin: string }) => z.object({ origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg: InventariaSettings = await readInventariaConfig(data.origin);
    return cfg;
  });

const SaveSchema = z.object({
  outbound_url: z.string().url().max(500).optional(),
  outbound_secret: z.string().min(8).max(255).optional().nullable(),
  inbound_secret: z.string().min(8).max(255).optional().nullable(),
  auto_send: z.boolean().optional(),
});

export const saveInventariaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.outbound_url !== undefined) {
      await writeInventariaSetting(
        INVENTARIA_KEYS.outboundUrl,
        data.outbound_url || DEFAULT_OUTBOUND_URL,
        false,
        context.userId,
      );
    }
    if (data.outbound_secret) {
      await writeInventariaSetting(INVENTARIA_KEYS.outboundSecret, data.outbound_secret, true, context.userId);
    }
    if (data.inbound_secret) {
      await writeInventariaSetting(INVENTARIA_KEYS.inboundSecret, data.inbound_secret, true, context.userId);
    }
    if (data.auto_send !== undefined) {
      await writeInventariaSetting(
        INVENTARIA_KEYS.autoSend,
        data.auto_send ? "true" : "false",
        false,
        context.userId,
      );
    }
    return { ok: true };
  });

export const pingInventaria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      const r = await postDocumentToInventaria(
        {
          title: "Ping Peticione.AI",
          piece_type: "ping",
          document_url: "https://example.invalid/peticione-ping.pdf",
          external_id: `ping:${Date.now()}`,
        },
        context.userId,
      );
      return { ok: r.ok, status: r.status, body: r.body.slice(0, 500) };
    } catch (err) {
      return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
    }
  });

const SendDocSchema = z.object({ pieceId: z.string().uuid() });

export const sendPieceToInventaria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendDocSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    if (!ver?.pdf_storage_path) throw new Error("Gere o PDF de Visual Law antes de enviar.");

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("piece-exports")
      .createSignedUrl(ver.pdf_storage_path, 60 * 60 * 24);
    if (signErr || !signed?.signedUrl) throw new Error("Falha ao gerar URL temporária do PDF.");

    let clientName: string | null = null;
    if (piece.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("client_name")
        .eq("id", piece.project_id)
        .maybeSingle();
      clientName = proj?.client_name ?? null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    const r = await postDocumentToInventaria(
      {
        title: piece.title,
        piece_type: piece.piece_type ?? "peca",
        client_name: clientName,
        document_url: signed.signedUrl,
        external_id: `peticione:${piece.id}`,
        owner_email: profile?.email ?? null,
      },
      userId,
    );
    return { ok: r.ok, status: r.status };
  });
