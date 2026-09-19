import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    unread_count: 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
