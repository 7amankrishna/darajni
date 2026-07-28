// Encryption, integrity, and constant-time comparison primitives for backups.
//
// AES-256-GCM (authenticated encryption): a unique random 12-byte IV is
// generated per backup. The ciphertext stream is what gets uploaded; the IV and
// the GCM authentication tag are stored separately in the backup manifest (and
// as small object-metadata fields) — never inside the archive. Decryption
// requires the key, the IV, and the auth tag, and the GCM finalization will
// reject any tampering of ciphertext or tag.
//
// No key, IV, tag, or plaintext is ever logged from this module.

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface EncryptStream {
  /** The cipher transform; pipe plaintext in, ciphertext out. */
  cipher: ReturnType<typeof createCipheriv>;
  /** The random IV used for this backup (store in the manifest). */
  iv: Buffer;
  /**
   * Returns the GCM authentication tag. Must be called AFTER the cipher has
   * finalized (i.e. after the downstream pipeline has finished), otherwise it
   * throws. Store the returned tag in the manifest.
   */
  getAuthTag: () => Buffer;
}

/**
 * Create an AES-256-GCM encrypting transform with a fresh random 12-byte IV.
 * The `key` must be exactly 32 bytes.
 */
export function createEncryptStream(key: Buffer): EncryptStream {
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (AES-256).");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  return {
    cipher,
    iv,
    getAuthTag: () => cipher.getAuthTag(),
  };
}

/**
 * Create an AES-256-GCM decrypting transform. The auth tag must be set before
 * any ciphertext is written. The decipher will throw on stream finalization if
 * the ciphertext or tag has been tampered with.
 */
export function createDecryptStream(key: Buffer, iv: Buffer, authTag: Buffer) {
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (AES-256).");
  }
  if (iv.length !== IV_LENGTH) {
    throw new Error(`IV must be exactly ${IV_LENGTH} bytes.`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher;
}

/** SHA-256 of a buffer as a lowercase hex string. */
export function sha256OfBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * A pass-through Transform that hashes every byte that flows through it and
 * counts the total bytes. Use it to tee integrity/size accounting off a
 * pipeline without buffering the payload. Call `getHash()` and `getBytes()`
 * after the stream has finished.
 */
export class HashingStream extends Transform {
  private readonly hash = createHash("sha256");
  private byteCount = 0;

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.hash.update(chunk);
    this.byteCount += chunk.length;
    callback(null, chunk);
  }

  getHash(): string {
    return this.hash.digest("hex");
  }

  getBytes(): number {
    return this.byteCount;
  }
}

/**
 * Constant-time, length-safe comparison of two secret strings. Returns true
 * only when both the lengths and contents match. When lengths differ, a dummy
 * comparison is still performed so the timing does not leak the length.
 */
export function timingSafeEqualSecrets(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Keep the timing characteristic similar without revealing the mismatch.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
