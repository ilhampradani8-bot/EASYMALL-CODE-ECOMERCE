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
  const newMsg = await sendMessage(user.email, receiverEmail, messageText);

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
