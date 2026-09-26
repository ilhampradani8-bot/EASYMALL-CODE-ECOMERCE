import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload, addWalletTopup } from '../../../lib/db';

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

export const POST: APIRoute = async ({ cookies, request }) => {
  const user = await resolveUser(cookies, request);
  const email = user && user.email ? user.email.toLowerCase().trim() : 'guest';

  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount) || 0;

    if (amount < 10000) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Minimal top up adalah Rp 10.000'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const trx_id = `TOPUP-${Date.now()}`;
    const total_amount = amount;
    
    // QR Server generator URL or gateway QRIS
    const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`00020101021226580016ID.CO.EASYMALL.WWW0118936009990000000000520458125303360540${total_amount}5802ID5910EASYMALL6007JAKARTA62070703A016304`)}`;

    await addWalletTopup({
      email,
      trx_id,
      amount,
      qr_url
    });

    return new Response(JSON.stringify({
      success: true,
      trx_id,
      amount,
      total_amount,
      qr_url,
      qris_image: qr_url,
      payment_url: '#'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Gagal memproses pembuatan QRIS Top Up'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
