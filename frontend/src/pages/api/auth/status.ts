import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  let sessionCookie = cookies.get('session_id');
  let tokenCookie = cookies.get('em_session_data');
  const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
  const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  let sessId = sessionCookie ? sessionCookie.value : (headerToken.startsWith('sess_') ? headerToken : '');
  let tokVal = tokenCookie ? tokenCookie.value : (!headerToken.startsWith('sess_') ? headerToken : '');

  const isDev = import.meta.env.DEV || process.env.NODE_ENV !== 'production';

  if (!sessId && !tokVal && isDev) {
    try {
      const { createSessionId, encodeSessionPayload, saveSession, saveUser } = await import('../../../lib/db');
      const email = 'user@easymall.me';
      const name = 'Demo User EasyMall';
      sessId = createSessionId(email, name);
      tokVal = encodeSessionPayload({ sessionId: sessId, email, name });

      await saveUser({ email, name, provider: 'email' });
      await saveSession(sessId, email, name);

      cookies.set('session_id', sessId, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
      });

      cookies.set('em_session_data', tokVal, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
      });
    } catch (err) {
      console.warn('Dev auto-login session generation warning:', err);
    }
  }

  if (sessId || tokVal) {
    try {
      const { getSession } = await import('../../../lib/db');
      const session = await getSession(sessId, tokVal);

      if (session && session.email) {
        const email = String(session.email).toLowerCase().trim();
        const name = String(session.name || 'User EasyMall');
        const provider = email.includes('google') || email.includes('@gmail') ? 'google' : 'email';

        const { saveUser } = await import('../../../lib/db');
        saveUser({ email, name, provider }).catch(err => {
          console.warn('Auto save user from session warning:', err);
        });

        return new Response(JSON.stringify({
          logged_in: true,
          email,
          name,
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



