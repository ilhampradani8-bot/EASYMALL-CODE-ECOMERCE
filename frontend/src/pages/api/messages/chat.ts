import type { APIRoute } from 'astro';
import { getChatHistory, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const targetEmail = url.searchParams.get('with_email') || url.searchParams.get('with') || 'admin@easymall.me';
  
  const user = getUserFromRequest(request, cookies);
  const messages = await getChatHistory(user.email, targetEmail);

  return new Response(JSON.stringify({
    success: true,
    user_email: user.email,
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
