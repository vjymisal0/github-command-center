import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptCredential, decryptCredential } from './crypto.js';

process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64);

test('encrypts and decrypts a GitHub credential with AES-256-GCM', () => {
  const secret = 'ghp_exampleTokenSecret1234567890abcdef';
  const encrypted = encryptCredential(secret);

  assert.equal(encrypted.keyVersion, 1);
  assert.notEqual(encrypted.ciphertext.toString('utf-8'), secret);
  assert.equal(encrypted.nonce.length, 12);
  assert.equal(encrypted.tag.length, 16);

  const decrypted = decryptCredential(encrypted);
  assert.equal(decrypted, secret);
});

test('fails decryption if ciphertext or tag is tampered', () => {
  const secret = 'ghp_anotherSecretToken';
  const encrypted = encryptCredential(secret);

  // Tamper ciphertext
  const tamperedCiphertext = Buffer.from(encrypted.ciphertext);
  tamperedCiphertext[0] = tamperedCiphertext[0] ^ 0xff;

  assert.throws(() => {
    decryptCredential({
      ...encrypted,
      ciphertext: tamperedCiphertext,
    });
  });
});
