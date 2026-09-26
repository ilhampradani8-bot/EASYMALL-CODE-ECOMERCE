import type { APIRoute } from 'astro';
import { updateTransactionStatus, getDb } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const transactionId = (params.transaction_id || '').trim();

  if (!transactionId) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Transaction ID is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const key = process.env.KOALASTORE_API_KEY || 'kb_live_af0475f0cd12d8ff9ceb5b087a8977ef09303d9f';
  let order: any = null;

  // 1. Try querying KoalaStore API
  try {
    // Attempt A: Search list
    const searchUrl = `https://koalastore.digital/api/v1/orders?search=${encodeURIComponent(transactionId)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'X-API-KEY': key,
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && Array.isArray(data.data)) {
        order = data.data.find((o: any) => 
          o.transaction_id === transactionId || 
          String(o.id) === transactionId ||
          (o.reference_id && o.reference_id === transactionId)
        );
      } else if (data && data.data && !Array.isArray(data.data)) {
        order = data.data;
      }
    }

    // Attempt B: Direct single order endpoint if not found
    if (!order) {
      try {
        const directUrl = `https://koalastore.digital/api/v1/orders/${encodeURIComponent(transactionId)}`;
        const directRes = await fetch(directUrl, {
          headers: {
            'X-API-KEY': key,
            'Accept': 'application/json'
          }
        });
        if (directRes.ok) {
          const directData = await directRes.json().catch(() => null);
          if (directData && (directData.data || directData.order)) {
            order = directData.data || directData.order;
          }
        }
      } catch (errB) {
        console.warn('Koala direct order fetch error:', errB);
      }
    }

    if (order) {
      const rawStatus = (order.status || 'pending').toLowerCase().trim();
      let status = 'pending';
      let stock_data: string | null = null;
      let sn: string | null = null;

      if (rawStatus === 'paid' || rawStatus === 'success' || rawStatus === 'completed' || rawStatus === 'settlement') {
        status = 'paid';
        if (Array.isArray(order.items) && order.items.length > 0) {
          const item = order.items[0];
          if (Array.isArray(item.stock_data) && item.stock_data.length > 0) {
            stock_data = item.stock_data.map((s: any) => s.data_stock || (typeof s === 'object' ? JSON.stringify(s) : s)).join('\n');
          } else if (item.stock_data) {
            stock_data = String(item.stock_data);
          }
          if (item.sn) sn = String(item.sn);
        }
        if (!stock_data && order.stock_data) {
          stock_data = Array.isArray(order.stock_data) 
            ? order.stock_data.map((s: any) => s.data_stock || (typeof s === 'object' ? JSON.stringify(s) : s)).join('\n') 
            : String(order.stock_data);
        }
        if (!sn && order.sn) sn = String(order.sn);
      } else if (rawStatus.includes('expire') || rawStatus === 'kadaluwarsa') {
        status = 'expired';
      } else if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'cancel' || rawStatus === 'refunded') {
        status = 'failed';
      } else if (rawStatus === 'processing') {
        status = 'processing';
      } else {
        status = 'pending';
      }

      // Persist status and credentials into database
      await updateTransactionStatus({
        transaction_id: transactionId,
        status,
        stock_data: stock_data || undefined,
        sn: sn || undefined
      });

      return new Response(JSON.stringify({
        success: true,
        status,
        message: status === 'paid' ? 'Pembayaran berhasil dan pesanan telah diproses!' : `Status transaksi: ${status}`,
        sn,
        link: null,
        stock_data,
        amount: order.total_amount || order.amount || 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('Error checking order status from KoalaStore:', err);
  }

  // 2. Check local/database status fallback
  try {
    const db = getDb();
    if (db) {
      const dbTx = await db.execute({
        sql: `SELECT * FROM transactions WHERE transaction_id = ? LIMIT 1`,
        args: [transactionId]
      });
      if (dbTx.rows && dbTx.rows.length > 0) {
        const row: any = dbTx.rows[0];
        const dbStatus = String(row.status || 'pending').toLowerCase();
        return new Response(JSON.stringify({
          success: true,
          status: dbStatus === 'success' ? 'paid' : dbStatus,
          message: 'Status pesanan berhasil dimuat dari database',
          sn: row.sn || null,
          link: row.link || null,
          stock_data: row.stock_data || null,
          amount: Number(row.amount) || 0
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (dbErr) {
    console.warn('Database fallback lookup error in order status:', dbErr);
  }

  // 3. Default pending fallback
  return new Response(JSON.stringify({
    success: true,
    status: 'pending',
    message: 'Transaksi sedang menunggu pembayaran / diproses',
    sn: null,
    link: null,
    stock_data: null,
    amount: 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

