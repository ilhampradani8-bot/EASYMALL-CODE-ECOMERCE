import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session_id');
  const tokenCookie = cookies.get('em_session_data');

  if ((sessionCookie && sessionCookie.value) || (tokenCookie && tokenCookie.value)) {
    try {
      const { getSession } = await import('../../../lib/db');
      const session = await getSession(sessionCookie ? sessionCookie.value : '', tokenCookie ? tokenCookie.value : '');

      if (session && session.email) {
        return new Response(JSON.stringify({
          logged_in: true,
          email: String(session.email),
          name: String(session.name || 'User EasyMall'),
          verified: 1
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
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
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
};

