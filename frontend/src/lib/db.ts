import { createClient, type Client } from '@libsql/client';

let dbClient: Client | null = null;

export function getDb(): Client | null {
  if (dbClient) return dbClient;

  const url = process.env.TURSO_DATABASE_URL;
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
        name TEXT,
        avatar TEXT,
        provider TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
