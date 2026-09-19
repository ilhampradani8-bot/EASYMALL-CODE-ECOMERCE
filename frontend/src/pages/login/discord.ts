import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  cookies.set('session_id', sessionId, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7
  });

  return redirect('/dashboard.html', 302);
};
