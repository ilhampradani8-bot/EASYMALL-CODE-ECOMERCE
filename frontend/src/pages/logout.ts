import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('session_id', { path: '/' });
  return redirect('/login.html', 302);
};
