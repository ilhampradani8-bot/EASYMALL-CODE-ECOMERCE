import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('with') || 'admin@easymall.me';

  return new Response(JSON.stringify({
    success: true,
    messages: [
      {
        id: 1,
        sender: target,
        recipient: 'user@easymall.me',
        message: 'Halo! Selamat datang di EasyMall. Silakan tanyakan hal seputar produk atau pesanan Anda.',
        created_at: new Date().toISOString()
      }
    ]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
