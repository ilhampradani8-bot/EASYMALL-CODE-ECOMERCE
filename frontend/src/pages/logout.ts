import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('session_id', { path: '/' });
  cookies.delete('em_session_data', { path: '/' });
  return redirect('/login', 302);
};

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('session_id', { path: '/' });
  cookies.delete('em_session_data', { path: '/' });
  return redirect('/login', 302);
};

