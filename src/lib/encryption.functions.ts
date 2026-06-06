import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PassphraseSchema = z
  .string()
  .min(12, "A senha-mestra precisa ter ao menos 12 caracteres")
  .max(256, "Senha-mestra muito longa");

/** Verifica se o usuário já configurou senha-mestra. */
export const getEncryptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_encryption_keys")
      .select("user_id, hint, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      configured: !!data,
      hint: data?.hint ?? null,
      configured_at: data?.created_at ?? null,
      updated_at: data?.updated_at ?? null,
    };
  });

/** Configura (ou substitui) a senha-mestra. AO TROCAR, certificados antigos ficam inacessíveis e devem ser re-cadastrados. */
export const setEncryptionPassphrase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { passphrase: string; hint?: string; confirmReset?: boolean }) => ({
    passphrase: PassphraseSchema.parse(d.passphrase),
    hint: d.hint ? z.string().max(120).parse(d.hint) : undefined,
    confirmReset: !!d.confirmReset,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { newSalt, computeVerifier, KDF_ITERATIONS } = await import("./encryption.server");

    const { data: existing } = await supabase
      .from("user_encryption_keys")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && !data.confirmReset) {
      throw new Error("Já existe uma senha-mestra configurada. Marque a opção de redefinição para substituir.");
    }

    if (existing && data.confirmReset) {
      // Apaga certificados existentes — não há como decriptá-los sem a passphrase antiga.
      await supabase.from("user_certificates").delete().eq("user_id", userId);
    }

    const salt = newSalt(16);
    const verifierSalt = newSalt(16);
    const verifier_hash = computeVerifier(data.passphrase, verifierSalt, KDF_ITERATIONS);

    const { error } = await supabase
      .from("user_encryption_keys")
      .upsert({
        user_id: userId,
        salt,
        verifier_salt: verifierSalt,
        verifier_hash,
        kdf_iterations: KDF_ITERATIONS,
        hint: data.hint ?? null,
      });
    if (error) throw new Error(error.message);

    return { ok: true, reset: !!existing };
  });

/** Valida a senha-mestra (sem revelar a chave). Útil para "testar" a senha. */
export const verifyEncryptionPassphrase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { passphrase: string }) => ({ passphrase: PassphraseSchema.parse(d.passphrase) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { verifyPassphrase } = await import("./encryption.server");

    const { data: row, error } = await supabase
      .from("user_encryption_keys")
      .select("verifier_salt, verifier_hash, kdf_iterations")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, reason: "not_configured" as const };

    const verifierSalt = Buffer.from(row.verifier_salt as unknown as string, "base64");
    const ok = verifyPassphrase(data.passphrase, verifierSalt, row.verifier_hash, row.kdf_iterations);
    return { ok, reason: ok ? null : ("invalid" as const) };
  });