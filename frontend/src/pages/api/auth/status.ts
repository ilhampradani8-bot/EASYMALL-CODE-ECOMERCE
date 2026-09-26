import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const sessionCookie = cookies.get('session_id');
  const tokenCookie = cookies.get('em_session_data');
  const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
  const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  const sessId = sessionCookie ? sessionCookie.value : (headerToken.startsWith('sess_') ? headerToken : '');
  const tokVal = tokenCookie ? tokenCookie.value : (!headerToken.startsWith('sess_') ? headerToken : '');

  if (sessId || tokVal) {
    try {
      const { getSession } = await import('../../../lib/db');
      const session = await getSession(sessId, tokVal);

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
            'Cache-Control': 'private, no-cache, no-store, must-revalidate'
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
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};


