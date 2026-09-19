export declare function getEncryptionKey(): Buffer;
export interface EncryptedPayload {
    keyVersion: number;
    ciphertext: Buffer;
    nonce: Buffer;
    tag: Buffer;
}
export declare function encryptCredential(plaintext: string, keyVersion?: number): EncryptedPayload;
export declare function decryptCredential(payload: {
    ciphertext: Buffer;
    nonce: Buffer;
    tag: Buffer;
}): string;
