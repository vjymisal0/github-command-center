import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(cookie, { secret: process.env.SESSION_SECRET ?? 'dev-only-change-me' });

app.get('/health', async () => ({ ok: true }));

app.get('/sync/status', async () => ({
  state: 'not_configured',
  message: 'Connect GitHub before first sync.',
}));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
