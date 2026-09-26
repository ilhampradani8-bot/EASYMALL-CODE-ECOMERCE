import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload, getDb } from '../../../lib/db';

export const prerender = false;

// In-memory fallback user settings store
const userSettingsStore = new Map<string, any>();

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

  if (!user || !user.email) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = user.email.toLowerCase().trim();
  const cached = userSettingsStore.get(email) || {};

  const responseData = {
    success: true,
    email: email,
    name: cached.name || user.name || (email.includes('reseller') ? 'Reseller Partner' : 'User EasyMall'),
    phone: cached.phone || '',
    verified: 1,
    recovery_email_1: cached.recovery_email_1 || '',
    recovery_email_2: cached.recovery_email_2 || '',
    bank_name: cached.bank_name || '',
    bank_account_number: cached.bank_account_number || '',
    bank_account_holder: cached.bank_account_holder || ''
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const user = await resolveUser(cookies, request);

  if (!user || !user.email) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const email = user.email.toLowerCase().trim();

    const existing = userSettingsStore.get(email) || {};
    const updated = {
      ...existing,
      email,
      name: body.name || existing.name || user.name,
      phone: body.phone !== undefined ? body.phone : existing.phone || '',
      recovery_email_1: body.recovery_email_1 !== undefined ? body.recovery_email_1 : existing.recovery_email_1 || '',
      recovery_email_2: body.recovery_email_2 !== undefined ? body.recovery_email_2 : existing.recovery_email_2 || '',
      bank_name: body.bank_name !== undefined ? body.bank_name : existing.bank_name || '',
      bank_account_number: body.bank_account_number !== undefined ? body.bank_account_number : existing.bank_account_number || '',
      bank_account_holder: body.bank_account_holder !== undefined ? body.bank_account_holder : existing.bank_account_holder || ''
    };

    userSettingsStore.set(email, updated);

    return new Response(JSON.stringify({
      success: true,
      message: 'Pengaturan berhasil disimpan',
      data: updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Gagal menyimpan pengaturan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
