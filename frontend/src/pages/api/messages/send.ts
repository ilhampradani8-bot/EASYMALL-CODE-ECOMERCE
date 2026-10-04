import type { APIRoute } from 'astro';
import { sendMessage, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json().catch(() => ({}));
  const receiverEmail = body.receiver_email || body.recipient || body.to || 'admin@easymall.me';
  const messageText = body.message || body.text || '';

  if (!messageText.trim()) {
    return new Response(JSON.stringify({ success: false, message: 'Message text is empty' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = getUserFromRequest(request, cookies);
  let senderEmail = user.email;
  let senderName = user.name;

  if (body.sender_email && (body.sender_email.includes('@') || body.sender_email.startsWith('guest_'))) {
    senderEmail = body.sender_email.toLowerCase().trim();
    if (body.sender_name) senderName = String(body.sender_name).trim();
  }

  const newMsg = await sendMessage(senderEmail, receiverEmail, messageText, senderName);

  return new Response(JSON.stringify({
    success: true,
    message: 'Message sent successfully',
    data: {
      ...newMsg,
      sender: newMsg.sender_email,
      recipient: newMsg.receiver_email
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};
