import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    items: []
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    message: 'Item added to cart'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    message: 'Cart cleared'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
