import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const email = 'user.discord@easymall.me';
  const name = 'Pengguna Discord';

  // Save User and Session to Turso Cloud Database
  const { saveUser, saveSession } = await import('../../../lib/db');
  await saveUser({ email, name, provider: 'discord' });
  await saveSession(sessionId, email, name);

  cookies.set('session_id', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7
  });

  return redirect('/dashboard.html', 302);
};
