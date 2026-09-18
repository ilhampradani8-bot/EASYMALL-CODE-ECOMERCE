import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session_id');

  if (sessionCookie && sessionCookie.value) {
    // If user has session cookie set
    return new Response(JSON.stringify({
      logged_in: true,
      email: 'user@easymall.me',
      name: 'User EasyMall',
      verified: 1
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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
