import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function getEncryptionKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || !/^[a-f0-9]{64}$/i.test(hex)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
  }
  return Buffer.from(hex, 'hex');
}

export interface EncryptedPayload {
  keyVersion: number;
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

export function encryptCredential(plaintext: string, keyVersion = 1): EncryptedPayload {
  const key = getEncryptionKey();
  const nonce = randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    keyVersion,
    ciphertext,
    nonce,
    tag,
  };
}

export function decryptCredential(payload: { ciphertext: Buffer; nonce: Buffer; tag: Buffer }): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, payload.nonce);
  decipher.setAuthTag(payload.tag);
  const decrypted = Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}
