import type { APIRoute } from 'astro';
import { getChatHistory, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const targetEmail = url.searchParams.get('with_email') || url.searchParams.get('with') || 'admin@easymall.me';
  const guestEmail = url.searchParams.get('guest_email');

  const user = getUserFromRequest(request, cookies);
  const currentEmail = (guestEmail && guestEmail.includes('@')) ? guestEmail.toLowerCase().trim() : user.email;
  
  const messages = await getChatHistory(currentEmail, targetEmail);

  return new Response(JSON.stringify({
    success: true,
    user_email: currentEmail,
    target_email: targetEmail,
    messages: messages.map(m => ({
      ...m,
      sender: m.sender_email,
      recipient: m.receiver_email
    }))
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};
