import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    total_orders: 0,
    total_sales: 0,
    total_profit: 0,
    transactions: [],
    profits: [],
    resellers: []
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
