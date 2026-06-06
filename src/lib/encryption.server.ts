import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

const KDF_ITERATIONS_DEFAULT = 210_000;
const KEY_LEN = 32; // AES-256
const VERIFIER_LEN = 32;

/** Deriva chave de criptografia a partir da passphrase + salt do usuário. */
export function deriveKey(passphrase: string, salt: Buffer, iterations = KDF_ITERATIONS_DEFAULT): Buffer {
  return pbkdf2Sync(passphrase.normalize("NFKC"), salt, iterations, KEY_LEN, "sha256");
}

/** Hash de verificação independente (não permite reverter a passphrase). */
export function computeVerifier(passphrase: string, verifierSalt: Buffer, iterations = KDF_ITERATIONS_DEFAULT): string {
  return pbkdf2Sync("verify::" + passphrase.normalize("NFKC"), verifierSalt, iterations, VERIFIER_LEN, "sha256").toString("hex");
}

export function verifyPassphrase(passphrase: string, verifierSalt: Buffer, expectedHex: string, iterations: number): boolean {
  const got = Buffer.from(computeVerifier(passphrase, verifierSalt, iterations), "hex");
  const exp = Buffer.from(expectedHex, "hex");
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

/** Gera salt aleatório de 16 bytes. */
export function newSalt(bytes = 16): Buffer {
  return randomBytes(bytes);
}

/** Criptografa um blob com AES-256-GCM usando a chave derivada. */
export function encryptBlob(plaintext: Uint8Array, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decryptBlob(ciphertext: Uint8Array, key: Buffer, iv: Uint8Array, tag: Uint8Array): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export const KDF_ITERATIONS = KDF_ITERATIONS_DEFAULT;