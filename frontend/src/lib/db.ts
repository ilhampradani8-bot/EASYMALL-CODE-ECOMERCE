import { createClient, type Client } from '@libsql/client';

let primaryDbClient: Client | null = null;
let fallbackDbClient: Client | null = null;

export function getDb(): Client {
  if (primaryDbClient) return primaryDbClient;

  const url = process.env.TURSO_DATABASE_URL || 'libsql://easymall-ilhampradani8-bot.aws-ap-south-1.turso.io';
  const authToken = (process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJMcUVKWWJQbEVmR0dybjd1d0FDRDhRIiwib3JnX2lkIjoxMDAwMjQ4OTQ4fQ.BrWGudcY6W6a4maX5ZJ4A-uzgX7ILztDxqi7A38HGuUSozRDEgLD1NDP8DwyJVFu2XdweROXPQV4plQKNUkyBg').trim();

  try {
    primaryDbClient = createClient({
      url,
      authToken
    });
    return primaryDbClient;
  } catch (err) {
    console.warn('Turso Cloud connection failed, using local SQLite fallback:', err);
    if (!fallbackDbClient) {
      fallbackDbClient = createClient({ url: 'file:local_easymall.db' });
    }
    return fallbackDbClient;
  }
}

function getLocalDb(): Client {
  if (!fallbackDbClient) {
    fallbackDbClient = createClient({ url: 'file:local_easymall.db' });
  }
  return fallbackDbClient;
}

async function execQuery(stmt: { sql: string; args: any[] }) {
  const primary = getDb();
  try {
    return await primary.execute(stmt);
  } catch (err: any) {
    // If Turso Cloud DB fails (e.g. 401 Unauthorized or network error), use local SQLite DB fallback
    const local = getLocalDb();
    return await local.execute(stmt);
  }
}

export async function saveTransaction(data: {
  transaction_id: string;
  whatsapp_id: string;
  product_name: string;
  variant_name: string;
  amount: number;
  provider: string;
  email?: string;
  status?: string;
}) {
  try {
    await execQuery({
      sql: `INSERT OR REPLACE INTO transactions (transaction_id, whatsapp_id, product_name, variant_name, amount, provider, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.transaction_id,
        data.whatsapp_id || '',
        data.product_name || '',
        data.variant_name || '',
        data.amount || 0,
        data.provider || 'koalastore',
        data.email || '',
        data.status || 'pending'
      ]
    });
  } catch (err) {
    console.error('Error saving transaction:', err);
  }
}

export async function saveUser(data: {
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
}) {
  if (!data.email) return;

  try {
    await execQuery({
      sql: `INSERT INTO users (email, name, avatar, provider) VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, provider = excluded.provider`,
      args: [
        data.email,
        data.name || 'User EasyMall',
        data.avatar || '',
        data.provider || 'email'
      ]
    });
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

export async function saveSession(sessionId: string, email: string, name?: string) {
  if (!sessionId || !email) return;

  try {
    await execQuery({
      sql: `INSERT OR REPLACE INTO sessions (session_id, email, name) VALUES (?, ?, ?)`,
      args: [sessionId, email, name || 'User EasyMall']
    });
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

export async function getSession(sessionId: string) {
  if (!sessionId) return null;

  try {
    const res = await execQuery({
      sql: `SELECT * FROM sessions WHERE session_id = ? LIMIT 1`,
      args: [sessionId]
    });
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting session:', err);
    return null;
  }
}

export async function verifyUserCredentials(emailInput: string, passwordInput?: string) {
  if (!emailInput) return null;

  try {
    const res = await execQuery({
      sql: `SELECT * FROM users WHERE email = ? LIMIT 1`,
      args: [emailInput]
    });

    if (res.rows.length === 0) return null;
    const user: any = res.rows[0];

    if (passwordInput && user.password && user.password !== passwordInput) {
      return null;
    }

    return user;
  } catch (err) {
    console.error('Error verifying user:', err);
    return null;
  }
}
