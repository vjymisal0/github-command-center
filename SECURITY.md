# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of GitHub Command Center seriously. If you believe you have found a security vulnerability in GitHub Command Center, please report it to us responsibly:

1. **Do not disclose the issue publicly** in an issue, discussion, or pull request.
2. Email details and steps to reproduce to the project maintainers.
3. You will receive an acknowledgment within 48 hours.

## Security Controls in v1

- **Credential Encryption**: Fine-grained PATs and GitHub App tokens are encrypted at rest using AES-256-GCM with a 96-bit nonce and 128-bit authentication tag.
- **Read-Only Surface**: The application does not support writing comments, merging PRs, or running workflows, minimizing blast radius.
- **Webhook Signature Verification**: Webhooks are verified using HMAC-SHA256 with constant-time equality checks (`timingSafeEqual`) to prevent replay or forgery attacks.
- **User Isolation**: Tenant data is scoped by user ID with session cookie protection (`HttpOnly`, `SameSite=lax`).
