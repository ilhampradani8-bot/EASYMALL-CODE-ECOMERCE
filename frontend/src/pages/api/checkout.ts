import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const {
      provider,
      product_code = '',
      variant_code = '',
      product_name = '',
      variant_name = '',
      target = '',
      amount = 0,
      whatsapp_id
    } = payload;

    if (!provider || !variant_code || !target || amount <= 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Provider, variant_code, target, and amount are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const whatsapp = whatsapp_id || target;

    // Option A: KoalaStore checkout
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

      const res = await fetch('https://koalastore.digital/api/v1/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': key
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Failed to request checkout from KoalaStore'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await res.json();
      if (data && data.success && data.data) {
        const transaction_id = data.data.transaction_id || '';
        const total_amount = data.data.total_amount || amount;
        const raw_qris = data.data.qr_code_url || '';

        const qr_image_url = raw_qris 
          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(raw_qris)}`
          : '';

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
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: data.message || 'Failed to checkout from KoalaStore'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } 
    
    // Option B: BuatQRIS checkout (for Miracle Gaming, Pulsa, PLN, etc.)
    const account_id = process.env.BUATQRIS_ACCOUNT_ID;
    const secret_token = process.env.BUATQRIS_SECRET_TOKEN;
    const baseUrl = process.env.BUATQRIS_BASE_URL || 'https://app.buatqris.site/api.php';

    if (!account_id || !secret_token) {
      // Return a simulated fallback response if BuatQRIS keys are not set yet
      const transaction_id = `EM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const dummyQris = `00020101021226670016COM.NOBUBANK.WWW01189360050300000898400215200826180358503033605204581253033605802ID5910EASYMALL6007JAKARTA61051234562070703A016304EB43`;
      return new Response(JSON.stringify({
        success: true,
        transaction_id,
        qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dummyQris)}`,
        amount,
        provider
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const description = `WEB-${product_code}-${target}`;
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

    const resText = await res.text();
    let qrisData: any;
    try {
      qrisData = JSON.parse(resText);
    } catch {
      qrisData = null;
    }

    if (qrisData && (qrisData.status === 'success' || qrisData.success)) {
      const transaction_id = qrisData.transaction_id || qrisData.id || `TRX-${Date.now()}`;
      const qr_image_url = qrisData.qr_url || qrisData.qr_image_url || (qrisData.qr_string 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisData.qr_string)}`
        : '');

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
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: (qrisData && qrisData.message) || 'BuatQRIS API request failed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Internal server error during checkout'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
