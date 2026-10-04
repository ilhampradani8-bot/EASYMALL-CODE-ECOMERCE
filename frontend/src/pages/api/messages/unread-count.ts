import type { APIRoute } from 'astro';
import { getUnreadCount, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const user = getUserFromRequest(request, cookies);
  const unreadCount = await getUnreadCount(user.email);

  return new Response(JSON.stringify({
    success: true,
    user_email: user.email,
    unread_count: unreadCount
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};
