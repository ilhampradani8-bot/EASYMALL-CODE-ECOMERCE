import type { APIRoute } from 'astro';
import { updateWalletTopupStatus } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const trx_id = url.searchParams.get('trx_id') || '';

  if (!trx_id) {
    return new Response(JSON.stringify({
      status: 'failed',
      message: 'Transaction ID is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Topup status checking (simulated or real confirmation)
  // For quick simulation or real QRIS check:
  return new Response(JSON.stringify({
    status: 'pending',
    message: 'Menunggu pembayaran via QRIS'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
