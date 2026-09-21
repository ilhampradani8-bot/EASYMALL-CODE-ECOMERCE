import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { getDb } = await import('../../../lib/db');
    const client = getDb();

    const usersRes = await client.execute('SELECT * FROM users ORDER BY id DESC LIMIT 50').catch(() => ({ rows: [] }));
    const sessionsRes = await client.execute('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50').catch(() => ({ rows: [] }));
    const transactionsRes = await client.execute('SELECT * FROM transactions ORDER BY id DESC LIMIT 50').catch(() => ({ rows: [] }));

    return new Response(JSON.stringify({
      success: true,
      database: 'local_easymall.db / Turso Cloud',
      tables: {
        users: usersRes.rows || [],
        sessions: sessionsRes.rows || [],
        transactions: transactionsRes.rows || []
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Gagal membaca database.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
