import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload } from '../../../lib/db';

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

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  const user = await resolveUser(cookies, request);
  const email = user && user.email ? user.email.toLowerCase().trim() : 'guest';
  const id = Number(params.id);

  return new Response(JSON.stringify({
    success: true,
    message: 'Item berhasil dihapus'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
