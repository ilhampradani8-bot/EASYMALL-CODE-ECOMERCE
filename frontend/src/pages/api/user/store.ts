import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload } from '../../../lib/db';

export const prerender = false;

// In-memory fallback store settings store
const userStoreSettings = new Map<string, any>();

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
  const cached = userStoreSettings.get(email) || {};

  const nickname = (user.name || email.split('@')[0]);
  const defaultStoreName = `Mall ${nickname}`;
  const defaultSlug = nickname.toLowerCase().replace(/[^a-z0-9]/g, '');

  const responseData = {
    success: true,
    store_name: cached.store_name || defaultStoreName,
    store_slug: cached.store_slug || defaultSlug,
    description: cached.description || 'Selamat datang di toko resmi saya di EasyMall!',
    phone: cached.phone || '',
    interests: cached.interests || 'Game, Software, Voucher',
    instagram: cached.instagram || '',
    tiktok: cached.tiktok || '',
    whatsapp: cached.whatsapp || '',
    is_hidden: cached.is_hidden || 0
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

    const existing = userStoreSettings.get(email) || {};
    const updated = {
      ...existing,
      store_name: body.store_name || existing.store_name || `Mall ${user.name || 'Merchant'}`,
      store_slug: body.store_slug || existing.store_slug || '',
      description: body.description !== undefined ? body.description : existing.description || '',
      phone: body.phone !== undefined ? body.phone : existing.phone || '',
      interests: body.interests !== undefined ? body.interests : existing.interests || '',
      instagram: body.instagram !== undefined ? body.instagram : existing.instagram || '',
      tiktok: body.tiktok !== undefined ? body.tiktok : existing.tiktok || '',
      whatsapp: body.whatsapp !== undefined ? body.whatsapp : existing.whatsapp || '',
      is_hidden: body.is_hidden !== undefined ? Number(body.is_hidden) : (existing.is_hidden || 0)
    };

    userStoreSettings.set(email, updated);

    return new Response(JSON.stringify({
      success: true,
      message: 'Pengaturan toko berhasil disimpan',
      data: updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Gagal menyimpan pengaturan toko' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
