// telegram-listener.mjs - Real-time Telegram Bot Poller
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8956671588:AAFSMMDe09zzt_2v4vhEsaOFhtflLMMdQTc';
const LOCAL_WEBHOOK_URL = 'http://127.0.0.1:4321/api/telegram/webhook';

let offset = 0;
let isPolling = true;

async function pollUpdates() {
  while (isPolling) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=25`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            // Forward update to local webhook endpoint
            try {
              await fetch(LOCAL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update)
              });
            } catch (err) {
              console.error('Failed to forward update to local webhook:', err.message);
            }
          }
        }
      }
    } catch (e) {
      // sleep 2s on network error
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

pollUpdates();
