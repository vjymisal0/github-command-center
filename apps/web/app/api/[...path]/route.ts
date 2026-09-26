import { buildApp } from '../../../../api/src/main';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const appPromise = buildApp();

async function handle(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const app = await appPromise;
  await app.ready();

  const { path = [] } = await context.params;
  const url = new URL(request.url);
  const apiPath = `/${path.join('/')}${url.search}`;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : Buffer.from(await request.arrayBuffer());

  const injected = await app.inject({
    method: request.method as any,
    url: apiPath,
    headers: Object.fromEntries(request.headers),
    payload: body,
  });

  const headers = new Headers();
  for (const [key, value] of Object.entries(injected.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach(item => headers.append(key, String(item)));
    else headers.set(key, String(value));
  }

  return new Response(injected.body, { status: injected.statusCode, headers });
}

export { handle as DELETE, handle as GET, handle as HEAD, handle as POST };
