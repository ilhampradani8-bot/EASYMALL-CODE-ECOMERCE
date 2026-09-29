import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    contacts: [
      {
        email: 'admin@easymall.me',
        name: 'Customer Support EasyMall',
        contact_email: 'admin@easymall.me',
        contact_name: 'Customer Support EasyMall',
        avatar: '/gambar/logo/easymall-logo.png',
        contact_avatar: '/gambar/logo/easymall-logo.png',
        unread_count: 0,
        last_message: 'Halo! Ada yang bisa kami bantu seputar transaksi EasyMall?',
        last_message_time: 'Baru saja',
        last_time: 'Baru saja'
      }
    ]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

