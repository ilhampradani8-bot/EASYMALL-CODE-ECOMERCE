import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { getSession, getTransactions } = await import('../../../lib/db');
    let email = '';
    const sessionCookie = cookies.get('session_id');
    const tokenCookie = cookies.get('em_session_data');
    const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
    const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const sessId = sessionCookie ? sessionCookie.value : (headerToken.startsWith('sess_') ? headerToken : '');
    const tokVal = tokenCookie ? tokenCookie.value : (!headerToken.startsWith('sess_') ? headerToken : '');

    if (sessId || tokVal) {
      const session = await getSession(sessId, tokVal);
      if (session && session.email) {
        email = String(session.email);
      }
    }

    const urlObj = new URL(request.url);
    const scope = urlObj.searchParams.get('scope') || '';

    if (scope === 'admin') {
      // Reseller Dashboard View:
      // STRICTLY ONLY load customer sales that yielded reseller profits for THIS reseller.
      // Direct personal purchases made by the user for themselves MUST NEVER appear here.
      let resellerTransactions: any[] = [];
      let profits: any[] = [];
      let resellers: any[] = [];

      try {
        const { getDb } = await import('../../../lib/db');
        const db = getDb();
        
        // Try querying reseller_profits if the table exists
        const profitsRes = await db.execute({
          sql: `SELECT transaction_id, reseller_wa, profit_amount, created_at FROM reseller_profits WHERE user_id = (SELECT id FROM users WHERE email = ? LIMIT 1) OR reseller_wa = ?`,
          args: [email, email]
        }).catch(() => null);

        if (profitsRes && profitsRes.rows) {
          profits = profitsRes.rows as any[];
        }

        if (profits.length > 0) {
          const txIds = profits.map(p => p.transaction_id);
          const placeholders = txIds.map(() => '?').join(',');
          const txRes = await db.execute({
            sql: `SELECT transaction_id, whatsapp_id, product_name, variant_name, amount, created_at FROM transactions WHERE transaction_id IN (${placeholders}) ORDER BY id DESC`,
            args: txIds
          }).catch(() => null);
          if (txRes && txRes.rows) {
            resellerTransactions = txRes.rows as any[];
          }
        }

        const resellersRes = await db.execute({
          sql: `SELECT activation_code, whatsapp_id, store_name, markup, is_active, created_at FROM resellers WHERE user_id = (SELECT id FROM users WHERE email = ? LIMIT 1) OR whatsapp_id = ?`,
          args: [email, email]
        }).catch(() => null);
        if (resellersRes && resellersRes.rows) {
          resellers = resellersRes.rows as any[];
        }
      } catch (e) {
        // Table might not exist or no reseller sales yet
      }

      const total_orders = resellerTransactions.length;
      const total_sales = resellerTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const total_profit = profits.reduce((sum, p) => sum + (Number(p.profit_amount) || 0), 0);

      return new Response(JSON.stringify({
        success: true,
        total_orders,
        total_sales,
        total_profit,
        transactions: resellerTransactions,
        profits,
        resellers
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Personal user dashboard view (Pesanan Saya): Only load direct personal transactions of this user
    const transactions: any[] = await getTransactions(email);
    const total_orders = transactions.length;
    const total_sales = 0;
    const total_profit = 0;

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
