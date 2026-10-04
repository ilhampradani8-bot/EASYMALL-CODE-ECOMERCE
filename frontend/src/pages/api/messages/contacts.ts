import type { APIRoute } from 'astro';
import { getContactsForUser, getUserFromRequest } from '../../../lib/messages';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const user = getUserFromRequest(request, cookies);
  const contacts = await getContactsForUser(user.email);

  return new Response(JSON.stringify({
    success: true,
    user_email: user.email,
    contacts: contacts.map(c => ({
      ...c,
      email: c.contact_email,
      name: c.contact_name,
      avatar: c.contact_avatar,
      last_time: c.last_message_time
    }))
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    }
  });
};
