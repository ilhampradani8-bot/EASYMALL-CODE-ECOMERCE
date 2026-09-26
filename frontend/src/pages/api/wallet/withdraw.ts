import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload, createWalletWithdrawal } from '../../../lib/db';

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
    const { amount, bank_name, bank_account, bank_holder } = body;

    if (!amount || amount < 10000) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Minimal penarikan adalah Rp 10.000'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!bank_name || !bank_account || !bank_holder) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lengkapi informasi rekening bank penerima'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const withdrawal = await createWalletWithdrawal({
      email,
      amount: Number(amount),
      bank_name,
      bank_account,
      bank_holder
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Penarikan saldo berhasil diajukan dan sedang diproses',
      data: withdrawal
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Gagal mengajukan penarikan saldo'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
