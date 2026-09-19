import { createClient, type Client } from '@libsql/client';

let dbClient: Client | null = null;

export function getDb(): Client | null {
  if (dbClient) return dbClient;

  const url = process.env.TURSO_DATABASE_URL || 'libsql://easymall-ilhampradani8-bot.aws-ap-south-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJMcUVKWWJQbEVmR0dybjd1d0FDRDhRIiwib3JnX2lkIjoxMDAwMjQ4OTQ4fQ.BrWGudcY6W6a4maX5ZJ4A-uzgX7ILztDxqi7A38HGuUSozRDEgLD1NDP8DwyJVFu2XdweROXPQV4plQKNUkyBg';

  if (!url) {
    return null;
  }

  try {
    dbClient = createClient({
      url,
      authToken
    });
    initTables(dbClient);
    return dbClient;
  } catch (err) {
    console.error('Failed to initialize Turso client:', err);
    return null;
  }
}

async function initTables(client: Client) {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        whatsapp_id TEXT,
        product_name TEXT,
        variant_name TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        provider TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        avatar TEXT,
        provider TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN password TEXT;`);
    } catch (e) {}

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed test dev accounts into Turso DB
    try {
      await client.execute({
        sql: `INSERT INTO users (email, password, name, provider) VALUES (?, ?, ?, ?)
              ON CONFLICT(email) DO UPDATE SET password = excluded.password, name = excluded.name`,
        args: ['user@easymall.me', 'user1234', 'Demo User EasyMall', 'email']
      });

      await client.execute({
        sql: `INSERT INTO users (email, password, name, provider) VALUES (?, ?, ?, ?)
              ON CONFLICT(email) DO UPDATE SET password = excluded.password, name = excluded.name`,
        args: ['reseller@easymall.me', 'reseller1234', 'Demo Reseller Partner', 'email']
      });
    } catch (e) {}
  } catch (err) {
    console.error('Failed to initialize Turso tables:', err);
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
  const db = getDb();
  if (!db) return;

  try {
    await db.execute({
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
    console.error('Error saving transaction to Turso:', err);
  }
}

export async function saveUser(data: {
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
}) {
  const db = getDb();
  if (!db || !data.email) return;

  try {
    await db.execute({
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
    console.error('Error saving user to Turso:', err);
  }
}

export async function saveSession(sessionId: string, email: string, name?: string) {
  const db = getDb();
  if (!db || !sessionId || !email) return;

  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO sessions (session_id, email, name) VALUES (?, ?, ?)`,
      args: [sessionId, email, name || 'User EasyMall']
    });
  } catch (err) {
    console.error('Error saving session to Turso:', err);
  }
}

export async function getSession(sessionId: string) {
  const db = getDb();
  if (!db || !sessionId) return null;

  try {
    const res = await db.execute({
      sql: `SELECT * FROM sessions WHERE session_id = ? LIMIT 1`,
      args: [sessionId]
    });
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting session from Turso:', err);
    return null;
  }
}

export async function verifyUserCredentials(emailInput: string, passwordInput?: string) {
  const db = getDb();
  if (!db || !emailInput) return null;

  try {
    const res = await db.execute({
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
    console.error('Error verifying user in Turso:', err);
    return null;
  }
}
