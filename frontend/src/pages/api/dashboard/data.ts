import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { getSession, getTransactions } = await import('../../../lib/db');
    let email = '';
    const sessionCookie = cookies.get('session_id');

    if (sessionCookie && sessionCookie.value) {
      const session = await getSession(sessionCookie.value);
      if (session && session.email) {
        email = String(session.email);
      }
    }

    const transactions: any[] = await getTransactions(email);

    const total_orders = transactions.length;
    const total_sales = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const total_profit = Math.round(total_sales * 0.1); // Estimated reseller / admin profit margin

    return new Response(JSON.stringify({
      success: true,
      total_orders,
      total_sales,
      total_profit,
      transactions,
      profits: [],
      resellers: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
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
  }
};
