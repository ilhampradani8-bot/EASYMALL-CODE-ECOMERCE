import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const { recipient = 'admin@easymall.me', message = '' } = body;

  return new Response(JSON.stringify({
    success: true,
    message: 'Message sent successfully',
    data: {
      id: Date.now(),
      sender: 'user@easymall.me',
      recipient,
      message,
      created_at: new Date().toISOString()
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
