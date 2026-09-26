import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload } from '../../../../lib/db';

export const prerender = false;

async function resolveUser(cookies: any, request: Request) {
  const sessionCookie = cookies.get('session_id');
  const tokenCookie = cookies.get('em_session_data');
  const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
  const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  const sessId = sessionCookie ? sessionCookie.value : (headerToken.startsWith('sess_') ? headerToken : '');
  const tokVal = tokenCookie ? tokenCookie.value : (!headerToken.startsWith('sess_') ? headerToken : '');

  if (sessId) {
    const parsed = parseSessionId(sessId);
    if (parsed && parsed.email) return parsed;
  }
  if (tokVal) {
    const decoded = decodeSessionPayload(tokVal);
    if (decoded && decoded.email) return decoded;
  }

  const session = await getSession(sessId, tokVal);
  if (session && session.email) return session;

  return null;
}

export const GET: APIRoute = async ({ cookies, request, params }) => {
  const user = await resolveUser(cookies, request);
  const id = params.id;

  return new Response(JSON.stringify({
    success: true,
    product: {
      id,
      name: 'Produk Detail',
      price: 0
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ cookies, request, params }) => {
  return new Response(JSON.stringify({
    success: true,
    message: 'Produk berhasil diperbarui'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  return new Response(JSON.stringify({
    success: true,
    message: 'Produk berhasil dihapus'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
