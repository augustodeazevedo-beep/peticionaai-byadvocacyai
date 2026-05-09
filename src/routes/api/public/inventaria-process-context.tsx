import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getInboundSecret, logIntegration } from "@/lib/inventaria.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Attachment = z.object({
  filename: z.string().min(1).max(255),
  url: z.string().url().max(2000),
  mime_type: z.string().min(1).max(120).optional(),
});

const PayloadSchema = z.object({
  external_id: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  owner_email: z.string().email().max(255),
  client_name: z.string().max(255).optional().nullable(),
  area: z.string().max(120).optional().nullable().default("sucessoes"),
  piece_type_hint: z.string().max(120).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  structured_payload: z.record(z.unknown()).optional().default({}),
  attachments: z.array(Attachment).max(20).optional().default([]),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function resolveUserId(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (data?.id) return data.id as string;
  try {
    const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
    const u = list?.users?.find((x: any) => (x.email ?? "").toLowerCase() === email.toLowerCase());
    return u?.id ?? null;
  } catch {
    return null;
  }
}

async function downloadAttachment(
  att: z.infer<typeof Attachment>,
  userId: string,
  pieceId: string,
): Promise<{ storage_path: string; size: number; mime: string } | null> {
  try {
    const res = await fetch(att.url, { redirect: "follow" });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 25 * 1024 * 1024) return null;
    const mime = att.mime_type || res.headers.get("content-type") || "application/octet-stream";
    const safeName = att.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);
    const path = `${userId}/${pieceId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from("case-files")
      .upload(path, new Uint8Array(arrayBuf), { contentType: mime, upsert: false });
    if (error) return null;
    return { storage_path: path, size: arrayBuf.byteLength, mime };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/inventaria-process-context")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const started = Date.now();
        const expected = await getInboundSecret();
        const provided = request.headers.get("x-webhook-secret");
        if (!expected) return jsonResponse({ error: "Inbound secret not configured." }, 503);
        if (!provided || !safeEqual(provided, expected)) {
          await logIntegration({
            integration: "inventaria_inbound",
            endpoint: "/api/public/inventaria-process-context",
            status_code: 401,
            ok: false,
            duration_ms: Date.now() - started,
            error: "Invalid or missing x-webhook-secret",
          });
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try { raw = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          await logIntegration({
            integration: "inventaria_inbound",
            endpoint: "/api/public/inventaria-process-context",
            status_code: 400,
            ok: false,
            duration_ms: Date.now() - started,
            request_summary: JSON.stringify(parsed.error.flatten()),
          });
          return jsonResponse({ error: parsed.error.flatten() }, 400);
        }
        const payload = parsed.data;

        const userId = await resolveUserId(payload.owner_email);
        if (!userId) {
          await logIntegration({
            integration: "inventaria_inbound",
            endpoint: "/api/public/inventaria-process-context",
            status_code: 404,
            ok: false,
            duration_ms: Date.now() - started,
            request_summary: `owner_email=${payload.owner_email}`,
          });
          return jsonResponse({ error: "Owner not found" }, 404);
        }

        // Dedup by external_id within user
        const { data: existingPiece } = await supabaseAdmin
          .from("pieces")
          .select("id, project_id")
          .eq("user_id", userId)
          .eq("input_data->>external_id", payload.external_id)
          .maybeSingle();
        if (existingPiece?.id) {
          await logIntegration({
            integration: "inventaria_inbound",
            endpoint: "/api/public/inventaria-process-context",
            status_code: 200,
            ok: true,
            duration_ms: Date.now() - started,
            user_id: userId,
            request_summary: `dedup external_id=${payload.external_id}`,
          });
          return jsonResponse(
            { ok: true, piece_id: existingPiece.id, project_id: existingPiece.project_id, dedup: true, deeplink: `/pecas/${existingPiece.id}` },
            200,
          );
        }

        // Project (use title since Inventaria não envia CNJ)
        const { data: project, error: pErr } = await supabaseAdmin
          .from("projects")
          .insert({
            user_id: userId,
            title: payload.title,
            client_name: payload.client_name,
            area: payload.area ?? "sucessoes",
            metadata: { source: "inventaria", external_id: payload.external_id },
          })
          .select("id")
          .single();
        if (pErr || !project) return jsonResponse({ error: pErr?.message ?? "project insert failed" }, 500);
        const projectId = project.id as string;

        const { data: piece, error: piErr } = await supabaseAdmin
          .from("pieces")
          .insert({
            user_id: userId,
            project_id: projectId,
            title: payload.title,
            piece_type: payload.piece_type_hint || "peticao_inventario_consensual",
            area: payload.area ?? "sucessoes",
            status: "draft",
            input_data: {
              source: "inventaria",
              external_id: payload.external_id,
              client_name: payload.client_name,
              summary: payload.summary,
              structured_payload: payload.structured_payload ?? {},
            },
          })
          .select("id")
          .single();
        if (piErr || !piece) return jsonResponse({ error: piErr?.message ?? "piece insert failed" }, 500);
        const pieceId = piece.id as string;

        const { data: ws, error: wsErr } = await supabaseAdmin
          .from("workspaces")
          .insert({
            user_id: userId,
            project_id: projectId,
            piece_id: pieceId,
            title: payload.title,
            instructions: payload.summary ?? "",
          })
          .select("id")
          .single();
        if (wsErr || !ws) return jsonResponse({ error: wsErr?.message ?? "workspace insert failed" }, 500);
        const workspaceId = ws.id as string;

        const attResults: { filename: string; ok: boolean }[] = [];
        for (const att of payload.attachments ?? []) {
          const dl = await downloadAttachment(att, userId, pieceId);
          if (!dl) { attResults.push({ filename: att.filename, ok: false }); continue; }
          await supabaseAdmin.from("case_files").insert({
            user_id: userId, project_id: projectId, piece_id: pieceId,
            filename: att.filename, mime_type: dl.mime, size_bytes: dl.size, storage_path: dl.storage_path,
          });
          await supabaseAdmin.from("workspace_context_items").insert({
            user_id: userId, workspace_id: workspaceId, type: "file" as any,
            title: att.filename, storage_path: dl.storage_path,
            payload: { source: "inventaria", mime: dl.mime, size: dl.size },
          });
          attResults.push({ filename: att.filename, ok: true });
        }

        await logIntegration({
          integration: "inventaria_inbound",
          endpoint: "/api/public/inventaria-process-context",
          status_code: 200,
          ok: true,
          duration_ms: Date.now() - started,
          user_id: userId,
          request_summary: `external_id=${payload.external_id} attachments=${attResults.length}`,
          response_summary: JSON.stringify({ pieceId, workspaceId }),
        });

        return jsonResponse(
          { ok: true, piece_id: pieceId, workspace_id: workspaceId, project_id: projectId, attachments: attResults, deeplink: `/pecas/${pieceId}` },
          200,
        );
      },
    },
  },
});
