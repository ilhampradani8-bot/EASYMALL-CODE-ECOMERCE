import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').toLowerCase().trim();

    const db = getDb();

    // 1. Fetch users from DB
    let userRows: any[] = [];
    try {
      const usersRes = await db.execute({
        sql: `SELECT id, email, name, avatar, provider, created_at FROM users ORDER BY id ASC LIMIT 100`,
        args: []
      });
      if (usersRes && usersRes.rows) {
        userRows = usersRes.rows as any[];
      }
    } catch (e) {
      console.warn('Could not query users table:', e);
    }

    // 2. Fetch resellers info if available
    let resellerRows: any[] = [];
    try {
      const resRes = await db.execute({
        sql: `SELECT activation_code, whatsapp_id, store_name, markup, is_active FROM resellers`,
        args: []
      });
      if (resRes && resRes.rows) {
        resellerRows = resRes.rows as any[];
      }
    } catch (e) {}


    // 4. Map and enhance user data
    const sellers = userRows.map(u => {
      const email = String(u.email || '').toLowerCase().trim();
      const name = String(u.name || email.split('@')[0] || 'User EasyMall');
      
      // Check if user has a store or reseller profile
      const isReseller = email.includes('reseller') || resellerRows.some(r => r.whatsapp_id === email || (r.store_name && r.store_name.toLowerCase().includes(name.toLowerCase())));
      const matchedReseller = resellerRows.find(r => r.whatsapp_id === email);
      
      const storeName = matchedReseller ? matchedReseller.store_name : (isReseller ? `Toko Partner ${name}` : (email.includes('admin') ? 'Official Store EasyMall' : `Stand ${name}`));
      const hasStore = isReseller || email.includes('admin') || email.includes('seller');

      return {
        id: u.id,
        name: name,
        email: email,
        avatar: u.avatar || '',
        has_store: hasStore,
        store_name: storeName,
        store_slug: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        is_reseller: isReseller,
        is_official: email.includes('admin'),
        role_label: email.includes('admin') ? 'Customer Support & Official' : (isReseller ? 'Reseller Partner' : 'Seller / Pengguna'),
        created_at: String(u.created_at || '')
      };
    });

    // 5. Apply search filter if provided
    const filtered = search ? sellers.filter(s => 
      s.name.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search) ||
      s.store_name.toLowerCase().includes(search)
    ) : sellers;

    return new Response(JSON.stringify({
      success: true,
      total: filtered.length,
      sellers: filtered
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      sellers: [],
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
