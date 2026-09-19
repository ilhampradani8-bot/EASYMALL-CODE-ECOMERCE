import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    contacts: [
      {
        email: 'admin@easymall.me',
        name: 'Customer Support EasyMall',
        avatar: '/favicon.svg',
        unread_count: 0,
        last_message: 'Halo! Ada yang bisa kami bantu?',
        last_time: 'Baru saja'
      }
    ]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
