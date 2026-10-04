import { getDb, parseSessionId, decodeSessionPayload } from './db';

export interface MessageItem {
  id: string;
  sender_email: string;
  sender_name?: string;
  receiver_email: string;
  receiver_name?: string;
  message: string;
  read: number; // 0 = unread, 1 = read
  created_at: string;
}

// In-memory store for instant zero-latency messaging across API routes
const memoryMessages: MessageItem[] = [
  {
    id: 'msg_init_1',
    sender_email: 'admin@easymall.me',
    sender_name: 'Customer Support EasyMall',
    receiver_email: 'user@easymall.me',
    receiver_name: 'Demo User EasyMall',
    message: 'Halo! Selamat datang di EasyMall. Silakan tanyakan hal seputar produk, pesanan, atau sistem reseller Anda di sini.',
    read: 0,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'msg_init_2',
    sender_email: 'reseller@easymall.me',
    sender_name: 'Demo Reseller Partner',
    receiver_email: 'user@easymall.me',
    receiver_name: 'Demo User EasyMall',
    message: 'Halo bos! Ada stok akun Netflix 2 User ready hari ini?',
    read: 0,
    created_at: new Date(Date.now() - 1800000).toISOString()
  }
];

// Helper to get user email from Astro request cookies / headers
export function getUserFromRequest(request: Request, cookies: any): { email: string; name: string } {
  try {
    const sessionCookie = cookies.get('session_id')?.value;
    const tokenCookie = cookies.get('em_session_data')?.value;
    const authHeader = request.headers.get('authorization') || request.headers.get('x-session-token');
    const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const sessId = sessionCookie || (headerToken.startsWith('sess_') ? headerToken : '');
    const tokVal = tokenCookie || (!headerToken.startsWith('sess_') ? headerToken : '');

    if (sessId) {
      const parsed = parseSessionId(sessId);
      if (parsed?.email) return { email: parsed.email.toLowerCase().trim(), name: parsed.name };
    }
    if (tokVal) {
      const decoded = decodeSessionPayload(tokVal);
      if (decoded?.email) return { email: decoded.email.toLowerCase().trim(), name: decoded.name };
    }
  } catch (e) {}

  return { email: 'user@easymall.me', name: 'Demo User EasyMall' };
}

// Name lookup helper
export function getNameForEmail(email: string): string {
  const norm = email.toLowerCase().trim();
  if (norm === 'admin@easymall.me') return 'Customer Support EasyMall';
  if (norm === 'reseller@easymall.me') return 'Demo Reseller Partner';
  if (norm === 'user@easymall.me') return 'Demo User EasyMall';
  const namePart = norm.split('@')[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

// Notify Telegram Admin Bot
export async function notifyTelegram(senderEmail: string, senderName: string, messageText: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  const text = `💬 <b>[EasyMall Live Chat]</b>\n👤 <b>Pengirim:</b> ${senderName} (<code>${senderEmail}</code>)\n\n📝 <b>Pesan:</b>\n${messageText}\n\n<i>👉 Balas (Reply) pesan ini di Telegram untuk membalas pembeli secara instan.</i>`;

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
    console.error('Failed to notify Telegram:', e);
  }
}

// Add new message
export async function sendMessage(senderEmail: string, receiverEmail: string, messageText: string): Promise<MessageItem> {
  const senderNorm = senderEmail.toLowerCase().trim();
  const receiverNorm = receiverEmail.toLowerCase().trim();
  
  const newMessage: MessageItem = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender_email: senderNorm,
    sender_name: getNameForEmail(senderNorm),
    receiver_email: receiverNorm,
    receiver_name: getNameForEmail(receiverNorm),
    message: messageText.trim(),
    read: 0,
    created_at: new Date().toISOString()
  };

  memoryMessages.push(newMessage);

  // Trigger Telegram notification if sent to admin or from a regular user
  if (senderNorm !== 'admin@easymall.me') {
    notifyTelegram(senderNorm, newMessage.sender_name || senderNorm, newMessage.message).catch(() => {});
  }

  // Async persist to SQLite if table exists
  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO messages (id, sender_email, receiver_email, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [newMessage.id, newMessage.sender_email, newMessage.receiver_email, newMessage.message, 0, newMessage.created_at]
    }).catch(() => {});
  } catch (e) {}

  return newMessage;
}

// Get chat history between two users
export async function getChatHistory(user1: string, user2: string): Promise<MessageItem[]> {
  const u1 = user1.toLowerCase().trim();
  const u2 = user2.toLowerCase().trim();

  // Mark unread messages from u2 to u1 as read
  for (const m of memoryMessages) {
    if (m.sender_email === u2 && m.receiver_email === u1) {
      m.read = 1;
    }
  }

  const filtered = memoryMessages.filter(m => 
    (m.sender_email === u1 && m.receiver_email === u2) ||
    (m.sender_email === u2 && m.receiver_email === u1)
  );

  return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// Get contact list for a given user
export async function getContactsForUser(userEmail: string) {
  const currentUser = userEmail.toLowerCase().trim();
  const contactsMap = new Map<string, {
    contact_email: string;
    contact_name: string;
    contact_avatar: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
    raw_time: number;
  }>();

  // Ensure default contacts exist so users always have someone to chat with
  const defaultContacts = [
    { email: 'admin@easymall.me', name: 'Customer Support EasyMall' },
    { email: 'reseller@easymall.me', name: 'Demo Reseller Partner' },
    { email: 'user@easymall.me', name: 'Demo User EasyMall' }
  ];

  for (const def of defaultContacts) {
    if (def.email !== currentUser) {
      contactsMap.set(def.email, {
        contact_email: def.email,
        contact_name: def.name,
        contact_avatar: def.email.includes('admin') ? '/gambar/logo/easymall-logo.png' : '',
        last_message: 'Mulai percakapan baru...',
        last_message_time: '',
        unread_count: 0,
        raw_time: 0
      });
    }
  }

  // Iterate all messages to collect conversations & unread count
  for (const m of memoryMessages) {
    let otherEmail = '';
    if (m.sender_email === currentUser) {
      otherEmail = m.receiver_email;
    } else if (m.receiver_email === currentUser) {
      otherEmail = m.sender_email;
    } else {
      continue;
    }

    const msgTime = new Date(m.created_at).getTime();
    let existing = contactsMap.get(otherEmail);

    if (!existing) {
      existing = {
        contact_email: otherEmail,
        contact_name: getNameForEmail(otherEmail),
        contact_avatar: otherEmail.includes('admin') ? '/gambar/logo/easymall-logo.png' : '',
        last_message: m.message,
        last_message_time: formatTime(m.created_at),
        unread_count: 0,
        raw_time: msgTime
      };
      contactsMap.set(otherEmail, existing);
    }

    if (msgTime >= existing.raw_time) {
      existing.last_message = m.message;
      existing.last_message_time = formatTime(m.created_at);
      existing.raw_time = msgTime;
    }

    if (m.receiver_email === currentUser && m.read === 0) {
      existing.unread_count += 1;
    }
  }

  const result = Array.from(contactsMap.values()).sort((a, b) => b.raw_time - a.raw_time);
  return result;
}

// Get total unread count for user
export async function getUnreadCount(userEmail: string): Promise<number> {
  const currentUser = userEmail.toLowerCase().trim();
  return memoryMessages.filter(m => m.receiver_email === currentUser && m.read === 0).length;
}

function formatTime(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  if (isToday) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
