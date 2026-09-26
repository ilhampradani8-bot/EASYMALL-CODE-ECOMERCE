import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload } from '../../../lib/db';

export const prerender = false;

// In-memory fallback user products store
const userSharedProducts = new Map<string, any[]>();

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
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized', products: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = user.email.toLowerCase().trim();
  const products = userSharedProducts.get(email) || [];

  return new Response(JSON.stringify({
    success: true,
    products
  }), {
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
    const products = userSharedProducts.get(email) || [];

    const newProduct = {
      id: Date.now(),
      name: body.name || 'Produk Kustom',
      price: Number(body.price || 0),
      original_price: Number(body.original_price || body.price || 0),
      category: body.category || 'Lainnya',
      description: body.description || '',
      image: body.image || '/gambar/logo/easymall-logo.png',
      variants: body.variants || [],
      is_active: body.is_active !== undefined ? body.is_active : 1,
      created_at: new Date().toISOString()
    };

    products.unshift(newProduct);
    userSharedProducts.set(email, products);

    return new Response(JSON.stringify({
      success: true,
      message: 'Produk berhasil ditambahkan',
      product: newProduct
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Gagal menambahkan produk' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
