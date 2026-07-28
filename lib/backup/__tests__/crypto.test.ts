import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

import {
  createDecryptStream,
  createEncryptStream,
  HashingStream,
  sha256OfBuffer,
  timingSafeEqualSecrets,
} from "@/lib/backup/crypto";

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function encryptBuffer(plaintext: Buffer, key: Buffer) {
  const { cipher, iv, getAuthTag } = createEncryptStream(key);
  cipher.write(plaintext);
  cipher.end();
  const ciphertext = await streamToBuffer(cipher);
  return { ciphertext, iv, authTag: getAuthTag() };
}

describe("createEncryptStream / createDecryptStream", () => {
  it("round-trips plaintext through GCM with iv + auth tag", async () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from("darajni backup payload\n".repeat(500));

    const { ciphertext, iv, authTag } = await encryptBuffer(plaintext, key);
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(ciphertext.equals(plaintext)).toBe(false);

    const decipher = createDecryptStream(key, iv, authTag);
    decipher.write(ciphertext);
    decipher.end();
    const decrypted = await streamToBuffer(decipher);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("produces a unique 12-byte IV per stream", () => {
    const key = randomBytes(32);
    const a = createEncryptStream(key);
    const b = createEncryptStream(key);
    expect(a.iv.length).toBe(12);
    expect(b.iv.length).toBe(12);
    expect(a.iv.equals(b.iv)).toBe(false);
  });

  it("rejects keys that are not exactly 32 bytes", () => {
    expect(() => createEncryptStream(randomBytes(16))).toThrow(/32 bytes/);
    expect(() => createEncryptStream(randomBytes(31))).toThrow(/32 bytes/);
    expect(() => createEncryptStream(randomBytes(33))).toThrow(/32 bytes/);
    expect(() =>
      createDecryptStream(randomBytes(16), randomBytes(12), randomBytes(16)),
    ).toThrow(/32 bytes/);
  });

  it("rejects an IV of the wrong length on decrypt", () => {
    const key = randomBytes(32);
    expect(() =>
      createDecryptStream(key, randomBytes(16), randomBytes(16)),
    ).toThrow(/12 bytes/);
  });

  it("throws when getAuthTag is called before finalization", () => {
    const { getAuthTag } = createEncryptStream(randomBytes(32));
    expect(() => getAuthTag()).toThrow();
  });

  it("fails decryption when the ciphertext is tampered", async () => {
    const key = randomBytes(32);
    const plaintext = Buffer.from("sensitive dump bytes");
    const { ciphertext, iv, authTag } = await encryptBuffer(plaintext, key);

    const tampered = Buffer.from(ciphertext);
    tampered[0] = tampered[0] ^ 0xff;

    const decipher = createDecryptStream(key, iv, authTag);
    decipher.write(tampered);
    decipher.end();
    await expect(streamToBuffer(decipher)).rejects.toThrow();
  });

  it("fails decryption with the wrong auth tag", async () => {
    const key = randomBytes(32);
    const { ciphertext, iv } = await encryptBuffer(Buffer.from("data"), key);
    const wrongTag = randomBytes(16);
    const decipher = createDecryptStream(key, iv, wrongTag);
    decipher.write(ciphertext);
    decipher.end();
    await expect(streamToBuffer(decipher)).rejects.toThrow();
  });

  it("fails decryption with the wrong key", async () => {
    const key = randomBytes(32);
    const { ciphertext, iv, authTag } = await encryptBuffer(Buffer.from("data"), key);
    const decipher = createDecryptStream(randomBytes(32), iv, authTag);
    decipher.write(ciphertext);
    decipher.end();
    await expect(streamToBuffer(decipher)).rejects.toThrow();
  });
});

describe("sha256OfBuffer", () => {
  it("matches known SHA-256 vectors", () => {
    expect(sha256OfBuffer(Buffer.from(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256OfBuffer(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("HashingStream", () => {
  it("passes bytes through unchanged while counting and hashing", async () => {
    const input = Buffer.concat([randomBytes(1000), randomBytes(37)]);
    const hasher = new HashingStream();
    hasher.write(input);
    hasher.end();
    const output = await streamToBuffer(hasher);

    expect(output.equals(input)).toBe(true);
    expect(hasher.getBytes()).toBe(input.length);
    expect(hasher.getHash()).toBe(sha256OfBuffer(input));
  });

  it("counts zero bytes for an empty stream", async () => {
    const hasher = new HashingStream();
    hasher.end();
    await streamToBuffer(hasher);
    expect(hasher.getBytes()).toBe(0);
    expect(hasher.getHash()).toBe(sha256OfBuffer(Buffer.from("")));
  });
});

describe("timingSafeEqualSecrets", () => {
  it("returns true for identical secrets", () => {
    expect(timingSafeEqualSecrets("super-secret", "super-secret")).toBe(true);
    expect(timingSafeEqualSecrets("", "")).toBe(true);
  });

  it("returns false for different secrets of the same length", () => {
    expect(timingSafeEqualSecrets("aaaaaaaa", "aaaaaaab")).toBe(false);
  });

  it("returns false for different lengths without throwing", () => {
    expect(timingSafeEqualSecrets("short", "much-longer-secret")).toBe(false);
    expect(timingSafeEqualSecrets("much-longer-secret", "short")).toBe(false);
    expect(timingSafeEqualSecrets("", "nonempty")).toBe(false);
  });
});
