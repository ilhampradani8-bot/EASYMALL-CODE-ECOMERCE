import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const email = 'user.discord@easymall.me';
  const name = 'Pengguna Discord';

  // Save User and Session
  const { saveUser, saveSession, encodeSessionPayload, createSessionId } = await import('../../../lib/db');
  await saveUser({ email, name, provider: 'discord' });

  const sessionId = createSessionId(email, name);
  await saveSession(sessionId, email, name);

  const token = encodeSessionPayload({ sessionId, email, name });

  cookies.set('session_id', sessionId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30
  });

  if (token) {
    cookies.set('em_session_data', token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return redirect('/dashboard_user', 302);
};

