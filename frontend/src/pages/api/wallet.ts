import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload, getWalletData } from '../../lib/db';

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

export const GET: APIRoute = async ({ cookies, request }) => {
  const user = await resolveUser(cookies, request);
  const email = user && user.email ? user.email.toLowerCase().trim() : 'guest';

  const wallet = await getWalletData(email);

  return new Response(JSON.stringify({
    success: true,
    email,
    balance: wallet.balance || 0,
    history: wallet.history || [],
    topups: wallet.topups || [],
    withdrawals: wallet.withdrawals || []
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
};
