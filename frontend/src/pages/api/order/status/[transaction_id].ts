import type { APIRoute } from 'astro';
import { updateTransactionStatus } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const transactionId = params.transaction_id || '';

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

  try {
    const url = `https://koalastore.digital/api/v1/orders?search=${encodeURIComponent(transactionId)}`;
    const res = await fetch(url, {
      headers: {
        'X-API-KEY': key
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        const order = data.data.find((o: any) => o.transaction_id === transactionId);
        if (order) {
          const rawStatus = order.status || 'pending';
          let status = 'pending';
          let stock_data = null;
          let sn = null;

          if (rawStatus === 'paid' || rawStatus === 'success') {
            status = 'paid';
            if (Array.isArray(order.items) && order.items.length > 0) {
              const item = order.items[0];
              if (Array.isArray(item.stock_data) && item.stock_data.length > 0) {
                // If multiple stock data items, join them
                stock_data = item.stock_data.map((s: any) => s.data_stock || s).join('\n');
              }
              if (item.sn) sn = item.sn;
            }
          } else if (rawStatus === 'failed' || rawStatus === 'cancelled') {
            status = 'failed';
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
            message: 'Order data retrieved successfully',
            sn,
            link: null,
            stock_data,
            amount: order.total_amount || 0
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  } catch (err) {
    console.error('Error checking order status from KoalaStore:', err);
  }

  // Fallback status response for simulated/other orders
  return new Response(JSON.stringify({
    success: true,
    status: 'pending',
    message: 'Transaksi sedang diproses',
    sn: null,
    link: null,
    stock_data: null,
    amount: 0
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
