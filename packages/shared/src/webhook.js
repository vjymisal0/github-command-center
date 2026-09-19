import { createHmac, timingSafeEqual } from 'node:crypto';
/**
 * Verify GitHub webhook raw payload against configured secret using HMAC-SHA256
 */
export function verifyGitHubWebhookSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || !secret) {
        return false;
    }
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
        return false;
    }
    const expectedSignature = parts[1];
    const hmac = createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');
    const digestBuffer = Buffer.from(digest, 'hex');
    const signatureBuffer = Buffer.from(expectedSignature, 'hex');
    if (digestBuffer.length !== signatureBuffer.length) {
        return false;
    }
    return timingSafeEqual(digestBuffer, signatureBuffer);
}
