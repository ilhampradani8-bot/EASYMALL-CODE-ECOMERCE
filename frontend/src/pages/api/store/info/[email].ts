import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const email = params.email || '';
  return new Response(JSON.stringify({
    success: true,
    store_name: 'EasyMall Store',
    description: 'Toko Digital Resmi EasyMall',
    phone: '',
    email
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
