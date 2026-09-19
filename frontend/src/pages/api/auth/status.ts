import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session_id');

  if (sessionCookie && sessionCookie.value) {
    try {
      const { getSession } = await import('../../../lib/db');
      const session = await getSession(sessionCookie.value);

      if (session) {
        return new Response(JSON.stringify({
          logged_in: true,
          email: String(session.email || 'user@easymall.me'),
          name: String(session.name || 'User EasyMall'),
          verified: 1
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      console.error('Error fetching auth status:', e);
    }
  }

  return new Response(JSON.stringify({
    logged_in: false,
    email: '',
    name: '',
    verified: 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
