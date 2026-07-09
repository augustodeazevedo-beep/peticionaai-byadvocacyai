import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getInboundSecret, logIntegration } from "@/lib/advoga.server";

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

function isAllowedAttachmentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return isSafeHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function isSafeHostname(hostnameRaw: string): boolean {
  const hostname = hostnameRaw.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
  // IPv4 checks
  const v4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false; // link-local / metadata
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a >= 224) return false; // multicast/reserved
  }
  // IPv6 checks (loopback, link-local, ULA, unspecified)
  if (hostname.includes(":")) {
    if (hostname === "::1" || hostname === "::") return false;
    if (hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) return false;
    if (hostname.startsWith("::ffff:")) return false; // IPv4-mapped
  }
  return true;
}

const PayloadSchema = z.object({
  external_id: z.string().min(1).max(255),
  numero_cnj: z.string().max(64).optional().nullable(),
  title: z.string().min(1).max(255),
  client_name: z.string().max(255).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  piece_type_hint: z.string().max(120).optional().nullable(),
  owner_email: z.string().email().max(255),
  attachments: z.array(Attachment).max(20).optional().default([]),
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function resolveUserId(email: string): Promise<string | null> {
  // Try profiles first (no service-role needed beyond admin client we already have)
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (data?.id) return data.id as string;
  // Fallback: list users via Auth Admin API
  try {
    const { data: list } = await (supabaseAdmin as any).auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const u = list?.users?.find(
      (x: any) => (x.email ?? "").toLowerCase() === email.toLowerCase(),
    );
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
    if (!isAllowedAttachmentUrl(att.url)) {
      console.warn("[advoga] Blocked SSRF attempt for attachment url", att.url);
      return null;
    }
    const res = await fetch(att.url, { redirect: "error" });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 25 * 1024 * 1024) return null; // 25MB limit
    const mime = att.mime_type || res.headers.get("content-type") || "application/octet-stream";
    const safeName = att.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);
    const path = `${userId}/${pieceId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from("case-files")
      .upload(path, new Uint8Array(arrayBuf), {
        contentType: mime,
        upsert: false,
      });
    if (error) return null;
    return { storage_path: path, size: arrayBuf.byteLength, mime };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/advoga-process-context")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const started = Date.now();
        const expected = await getInboundSecret();
        const provided = request.headers.get("x-webhook-secret");
        if (!expected) {
          return jsonResponse({ error: "Inbound secret not configured." }, 503);
        }
        if (!provided || !safeEqual(provided, expected)) {
          await logIntegration({
            integration: "advoga_inbound",
            endpoint: "/api/public/advoga-process-context",
            status_code: 401,
            ok: false,
            duration_ms: Date.now() - started,
            error: "Invalid or missing x-webhook-secret",
          });
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          await logIntegration({
            integration: "advoga_inbound",
            endpoint: "/api/public/advoga-process-context",
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
            integration: "advoga_inbound",
            endpoint: "/api/public/advoga-process-context",
            status_code: 404,
            ok: false,
            duration_ms: Date.now() - started,
            request_summary: `owner_email=${payload.owner_email}`,
          });
          return jsonResponse({ error: "Owner not found" }, 404);
        }

        // Upsert project (by user_id + cnj_number when available)
        let projectId: string | null = null;
        if (payload.numero_cnj) {
          const { data: existing } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("user_id", userId)
            .eq("cnj_number", payload.numero_cnj)
            .maybeSingle();
          if (existing?.id) {
            projectId = existing.id as string;
          } else {
            const { data: created, error: pErr } = await supabaseAdmin
              .from("projects")
              .insert({
                user_id: userId,
                title: payload.title,
                client_name: payload.client_name,
                area: payload.area,
                cnj_number: payload.numero_cnj,
                metadata: { source: "advoga", external_id: payload.external_id },
              })
              .select("id")
              .single();
            if (pErr) return jsonResponse({ error: pErr.message }, 500);
            projectId = created.id as string;
          }
        }

        // Create piece (draft)
        const { data: piece, error: piErr } = await supabaseAdmin
          .from("pieces")
          .insert({
            user_id: userId,
            project_id: projectId,
            title: payload.title,
            piece_type: payload.piece_type_hint || "peticao_inicial_civel",
            area: payload.area,
            status: "draft",
            input_data: {
              source: "advoga",
              external_id: payload.external_id,
              client_name: payload.client_name,
              summary: payload.summary,
            },
          })
          .select("id")
          .single();
        if (piErr || !piece) return jsonResponse({ error: piErr?.message ?? "piece insert failed" }, 500);
        const pieceId = piece.id as string;

        // Workspace tied to piece
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

        // Attachments
        const attResults: { filename: string; ok: boolean }[] = [];
        for (const att of payload.attachments ?? []) {
          const dl = await downloadAttachment(att, userId, pieceId);
          if (!dl) {
            attResults.push({ filename: att.filename, ok: false });
            continue;
          }
          await supabaseAdmin.from("case_files").insert({
            user_id: userId,
            project_id: projectId,
            piece_id: pieceId,
            filename: att.filename,
            mime_type: dl.mime,
            size_bytes: dl.size,
            storage_path: dl.storage_path,
          });
          await supabaseAdmin.from("workspace_context_items").insert({
            user_id: userId,
            workspace_id: workspaceId,
            type: "file" as any,
            title: att.filename,
            storage_path: dl.storage_path,
            payload: { source: "advoga", mime: dl.mime, size: dl.size },
          });
          attResults.push({ filename: att.filename, ok: true });
        }

        await logIntegration({
          integration: "advoga_inbound",
          endpoint: "/api/public/advoga-process-context",
          status_code: 200,
          ok: true,
          duration_ms: Date.now() - started,
          user_id: userId,
          request_summary: `external_id=${payload.external_id} cnj=${payload.numero_cnj ?? "-"} attachments=${attResults.length}`,
          response_summary: JSON.stringify({ pieceId, workspaceId }),
        });

        return jsonResponse(
          {
            ok: true,
            piece_id: pieceId,
            workspace_id: workspaceId,
            project_id: projectId,
            attachments: attResults,
            deeplink: `/pecas/${pieceId}`,
          },
          200,
        );
      },
    },
  },
});