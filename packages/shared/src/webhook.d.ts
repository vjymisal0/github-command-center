/**
 * Verify GitHub webhook raw payload against configured secret using HMAC-SHA256
 */
export declare function verifyGitHubWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined, secret: string): boolean;
