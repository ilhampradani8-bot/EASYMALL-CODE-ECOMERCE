import type { APIRoute } from 'astro';
import { saveTransaction } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = await request.json().catch(() => ({}));
    const {
      provider = 'koalastore',
      product_code = '',
      variant_code = '',
      product_name = '',
      variant_name = '',
      target = '',
      amount = 0,
      whatsapp_id,
      email = '',
      user_email = ''
    } = payload;

    let userEmail = (email || user_email || '').toLowerCase().trim();
    const sessionCookie = cookies.get('session_id');
    const tokenCookie = cookies.get('em_session_data');
    const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
    const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const sessId = sessionCookie ? sessionCookie.value : (headerToken.startsWith('sess_') ? headerToken : '');
    const tokVal = tokenCookie ? tokenCookie.value : (!headerToken.startsWith('sess_') ? headerToken : '');

    if (sessId || tokVal) {
      try {
        const { getSession } = await import('../../lib/db');
        const session = await getSession(sessId, tokVal);
        if (session && session.email) {
          userEmail = String(session.email).toLowerCase().trim();
        }
      } catch (e) {}
    }

    if (!variant_code || !target || amount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Mohon lengkapi varian, ID/nomor tujuan, dan nominal pembayaran.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const whatsapp = whatsapp_id || target;

    // 1. Try KoalaStore checkout if provider is koalastore
    if (provider === 'koalastore') {
      const key = process.env.KOALASTORE_API_KEY || 'kb_live_af0475f0cd12d8ff9ceb5b087a8977ef09303d9f';
      const body = {
        payment_type: 'qris',
        items: [
          {
            variant_code,
            quantity: 1
          }
        ],
        customer_amount: amount
      };

      try {
        const res = await fetch('https://koalastore.digital/api/v1/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': key
          },
          body: JSON.stringify(body)
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && data.success && data.data) {
          const transaction_id = data.data.transaction_id || `EM-${Date.now()}`;
          const total_amount = data.data.total_amount || amount;
          const raw_qris = data.data.qr_code_url || '';

          // If raw_qris is already a full image URL (e.g. Belibayar PNG), use it directly
          let qr_image_url = '';
          if (raw_qris.startsWith('http://') || raw_qris.startsWith('https://') || raw_qris.startsWith('data:image/')) {
            qr_image_url = raw_qris;
          } else if (raw_qris) {
            qr_image_url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(raw_qris)}`;
          }

          await saveTransaction({
            transaction_id,
            whatsapp_id: whatsapp,
            product_name,
            variant_name,
            amount: total_amount,
            provider: 'koalastore',
            email: userEmail,
            status: 'pending'
          });

          return new Response(JSON.stringify({
            success: true,
            transaction_id,
            qr_image_url,
            amount: total_amount,
            provider: 'koalastore'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (data && !data.success) {
          const errMsg = data.message || (Array.isArray(data.data) ? data.data.join(', ') : 'Gagal membuat pesanan di payment gateway.');
          return new Response(JSON.stringify({
            success: false,
            message: errMsg
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e: any) {
        console.error('KoalaStore API error:', e);
      }
    }

    // 2. Try BuatQRIS API if keys are configured
    const account_id = process.env.BUATQRIS_ACCOUNT_ID;
    const secret_token = process.env.BUATQRIS_SECRET_TOKEN;
    const baseUrl = process.env.BUATQRIS_BASE_URL || 'https://app.buatqris.site/api.php';

    if (account_id && secret_token) {
      try {
        const description = `WEB-${product_code || variant_code}-${target}`;
        const params = new URLSearchParams();
        params.append('action', 'api_create_qris');
        params.append('account_id', account_id);
        params.append('secret_token', secret_token);
        params.append('amount', String(amount));
        params.append('description', description);
        params.append('qris_method', 'qris_two');

        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (res.ok) {
          const resText = await res.text();
          let qrisData: any = null;
          try { qrisData = JSON.parse(resText); } catch {}

          if (qrisData && (qrisData.status === 'success' || qrisData.success)) {
            const transaction_id = qrisData.transaction_id || qrisData.id || `TRX-${Date.now()}`;
            const rawQr = qrisData.qr_url || qrisData.qr_image_url || qrisData.qris_image || qrisData.qr_string || '';
            let qr_image_url = '';
            if (rawQr.startsWith('http://') || rawQr.startsWith('https://') || rawQr.startsWith('data:image/')) {
              qr_image_url = rawQr;
            } else if (rawQr) {
              qr_image_url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawQr)}`;
            }

            await saveTransaction({
              transaction_id,
              whatsapp_id: whatsapp,
              product_name,
              variant_name,
              amount,
              provider,
              email: userEmail,
              status: 'pending'
            });

            return new Response(JSON.stringify({
              success: true,
              transaction_id,
              qr_image_url,
              amount,
              provider
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (e) {
        console.error('BuatQRIS API error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Layanan checkout QRIS untuk produk ini sedang dalam pemeliharaan. Silakan hubungi admin.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Gagal memproses pemesanan.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
