import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
// 32-byte key required for AES-256-GCM
const DEFAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
export function getEncryptionKey() {
    const hex = process.env.CREDENTIAL_ENCRYPTION_KEY ?? DEFAULT_KEY;
    if (hex.length === 64) {
        return Buffer.from(hex, 'hex');
    }
    // Fallback: pad or slice to 32 bytes
    const buf = Buffer.alloc(32);
    buf.write(hex, 'utf-8');
    return buf;
}
export function encryptCredential(plaintext, keyVersion = 1) {
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
export function decryptCredential(payload) {
    const key = getEncryptionKey();
    const decipher = createDecipheriv('aes-256-gcm', key, payload.nonce);
    decipher.setAuthTag(payload.tag);
    const decrypted = Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
    return decrypted.toString('utf-8');
}
