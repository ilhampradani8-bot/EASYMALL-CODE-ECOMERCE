import type { APIRoute } from 'astro';
import { getChatHistory, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const targetEmail = url.searchParams.get('with_email') || url.searchParams.get('with') || 'admin@easymall.me';
  const guestEmail = url.searchParams.get('guest_email');

  const user = getUserFromRequest(request, cookies);
  const isAuthenticated = user.email && user.email !== 'user@easymall.me' && !user.email.startsWith('tamu_') && !user.email.startsWith('guest_');

  let currentEmail = user.email;
  if (!isAuthenticated && guestEmail && guestEmail.includes('@')) {
    currentEmail = guestEmail.toLowerCase().trim();
  }
  
  const messages = await getChatHistory(currentEmail, targetEmail, guestEmail || undefined);

  return new Response(JSON.stringify({
    success: true,
    user_email: currentEmail,
    target_email: targetEmail,
    is_authenticated: isAuthenticated,
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
