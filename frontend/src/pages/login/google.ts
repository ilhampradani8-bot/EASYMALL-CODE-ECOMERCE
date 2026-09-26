import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData().catch(() => null);
    const credential = formData ? formData.get('credential') : null;

    let email = 'user.google@easymall.me';
    let name = 'Pengguna Google';

    if (credential) {
      // Decode JWT payload for user info if available
      try {
        const parts = String(credential).split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email) email = payload.email;
          if (payload.name) name = payload.name;
        }
      } catch (e) {
        console.error('Failed to parse Google JWT payload:', e);
      }
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Save User and Session
    const { saveUser, saveSession, encodeSessionPayload } = await import('../../lib/db');
    await saveUser({ email, name, provider: 'google' });
    await saveSession(sessionId, email, name);

    const token = encodeSessionPayload({ sessionId, email, name });

    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    if (token) {
      cookies.set('em_session_data', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    if (email.includes('reseller') || name.includes('Reseller')) {
      return redirect('/dashboard_reseller', 302);
    } else {
      return redirect('/dashboard_user', 302);
    }
  } catch (err) {
    return redirect('/login?error=google_failed', 302);
  }
};

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/dashboard', 302);
};

