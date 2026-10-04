import type { APIRoute } from 'astro';
import { sendMessage } from '../../../lib/messages';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  
  try {
    const update = await request.json().catch(() => ({}));
    const message = update?.message;

    if (!message) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const chatId = message.chat?.id;
    const text = message.text?.trim() || '';

    // Handle /start or /id command
    if (text === '/start' || text === '/id' || text === '/help') {
      const welcomeText = `👋 <b>Selamat Datang di EasyMall Admin Bot!</b>\n\n` +
        `🆔 <b>Chat ID Anda:</b> <code>${chatId}</code>\n\n` +
        `📋 <b>Panduan:</b>\n` +
        `1. Masukkan Chat ID ini ke variabel <code>TELEGRAM_ADMIN_CHAT_ID</code> di file <code>frontend/.env</code>\n` +
        `2. Setiap ada pembeli chat di web (/pesan), bot akan mengirimkan notifikasi ke sini.\n` +
        `3. Cukup tekan <b>Reply (Balas)</b> pada notifikasi pembeli tersebut di Telegram, maka balasan Anda langsung muncul di web pembeli secara real-time!\n\n` +
        `💡 Atau Anda bisa ketik manual:\n<code>/reply email_pembeli@domain.com pesan balasan</code>`;

      await sendTelegramMessage(token, chatId, welcomeText);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Handle Reply to buyer's message
    if (message.reply_to_message && text) {
      const quotedText = message.reply_to_message.text || '';
      // Extract email address using regex
      const emailMatch = quotedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      
      if (emailMatch && emailMatch[1]) {
        const targetEmail = emailMatch[1].toLowerCase().trim();
        
        // Save reply into chat system as Customer Support Admin
        await sendMessage('admin@easymall.me', targetEmail, text);

        await sendTelegramMessage(token, chatId, `✅ <b>Terkirim ke pembeli (${targetEmail})</b>:\n<i>"${text}"</i>`);
        return new Response(JSON.stringify({ ok: true, delivered: true, to: targetEmail }), { status: 200 });
      }
    }

    // Handle manual /reply command
    if (text.startsWith('/reply ')) {
      const rawContent = text.substring(7).trim();
      const firstSpaceIndex = rawContent.indexOf(' ');
      
      if (firstSpaceIndex !== -1) {
        const targetEmail = rawContent.substring(0, firstSpaceIndex).trim().toLowerCase();
        const replyText = rawContent.substring(firstSpaceIndex + 1).trim();

        if (targetEmail.includes('@') && replyText) {
          await sendMessage('admin@easymall.me', targetEmail, replyText);
          await sendTelegramMessage(token, chatId, `✅ <b>Terkirim ke ${targetEmail}</b>:\n<i>"${replyText}"</i>`);
          return new Response(JSON.stringify({ ok: true, delivered: true }), { status: 200 });
        }
      }
      
      await sendTelegramMessage(token, chatId, `⚠️ Format salah. Gunakan:\n<code>/reply email_user@domain.com pesan Anda</code>`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

  } catch (err) {
    console.error('Telegram Webhook error:', err);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

export const GET: APIRoute = async ({ url }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8956671588:AAFSMMDe09zzt_2v4vhEsaOFhtflLMMdQTc';
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '8570234554';
  const action = url.searchParams.get('action');

  let setupResult = null;
  const targetWebhookUrl = `${url.origin}/api/telegram/webhook`;

  if (action === 'set_webhook' && token) {
    try {
      const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(targetWebhookUrl)}`);
      setupResult = await setRes.json();
    } catch (e: any) {
      setupResult = { error: e?.message || String(e) };
    }
  }

  // Get current telegram webhook info
  let currentWebhookInfo = null;
  if (token) {
    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      currentWebhookInfo = await infoRes.json();
    } catch (e) {}
  }

  return new Response(JSON.stringify({
    status: 'Telegram Webhook Gateway Active',
    bot_token_status: token ? 'Tersedia (Configured)' : 'Belum diisi',
    admin_chat_id_status: chatId ? 'Tersedia (Configured)' : 'Belum diisi',
    current_webhook_info: currentWebhookInfo,
    setup_result: setupResult,
    webhook_url: targetWebhookUrl,
    how_to_activate: `Buka ${url.origin}/api/telegram/webhook?action=set_webhook untuk mendaftarkan domain ini ke Telegram bot secara otomatis.`
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

async function sendTelegramMessage(token: string, chatId: string | number, text: string) {
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Error sending message to Telegram:', e);
  }
}
