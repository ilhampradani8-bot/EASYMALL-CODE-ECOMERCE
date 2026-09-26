import type { APIRoute } from 'astro';
import { getSession, parseSessionId, decodeSessionPayload, getDb } from '../../lib/db';

export const prerender = false;

// Global in-memory cart store for serverless resilience
const userCarts = new Map<string, Array<{
  id: number;
  email: string;
  product_code: string;
  product_name: string;
  variant_code: string;
  variant_name: string;
  price: number;
  quantity: number;
  created_at: string;
}>>();

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

  const items = userCarts.get(email) || [];

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const user = await resolveUser(cookies, request);
  const email = user && user.email ? user.email.toLowerCase().trim() : 'guest';

  try {
    const body = await request.json();
    const {
      product_code = '',
      product_name = '',
      variant_code = '',
      variant_name = '',
      price = 0,
      quantity = 1
    } = body;

    const cart = userCarts.get(email) || [];
    const existingIdx = cart.findIndex(
      item => item.product_code === product_code && item.variant_code === variant_code
    );

    let updatedItem: any;
    if (existingIdx >= 0) {
      cart[existingIdx].quantity += (Number(quantity) || 1);
      updatedItem = cart[existingIdx];
    } else {
      updatedItem = {
        id: Date.now(),
        email,
        product_code,
        product_name,
        variant_code,
        variant_name,
        price: Number(price) || 0,
        quantity: Number(quantity) || 1,
        created_at: new Date().toISOString()
      };
      cart.unshift(updatedItem);
    }

    userCarts.set(email, cart);

    return new Response(JSON.stringify({
      success: true,
      message: 'Produk berhasil dimasukkan ke keranjang!',
      item: updatedItem
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Gagal menambahkan ke keranjang'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies, request }) => {
  const user = await resolveUser(cookies, request);
  const email = user && user.email ? user.email.toLowerCase().trim() : 'guest';

  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');

    if (idParam) {
      const id = Number(idParam);
      const cart = userCarts.get(email) || [];
      userCarts.set(email, cart.filter(item => item.id !== id));
    } else {
      userCarts.set(email, []);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Keranjang berhasil diperbarui'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Gagal menghapus keranjang'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
