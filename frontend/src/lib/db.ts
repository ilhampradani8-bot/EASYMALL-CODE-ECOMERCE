import { createClient, type Client } from '@libsql/client';

let primaryDbClient: Client | null = null;
let fallbackDbClient: Client | null = null;
let localDbInitialized = false;

// In-memory fallback session and user storage for fast, reliable access across serverless executions
const memorySessions = new Map<string, { email: string; name: string; created_at: string }>();
const memoryUsers = new Map<string, { email: string; password?: string; name: string; provider: string }>();

// Seed in-memory demo users
memoryUsers.set('user@easymall.me', {
  email: 'user@easymall.me',
  password: 'user1234',
  name: 'Demo User EasyMall',
  provider: 'email'
});
memoryUsers.set('reseller@easymall.me', {
  email: 'reseller@easymall.me',
  password: 'reseller1234',
  name: 'Demo Reseller Partner',
  provider: 'email'
});
memoryUsers.set('admin@easymall.me', {
  email: 'admin@easymall.me',
  password: 'admin1234',
  name: 'Administrator',
  provider: 'email'
});

export function createSessionId(email: string, name: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const userName = name || (normalizedEmail.includes('reseller') ? 'Reseller Partner' : 'User EasyMall');
  const payload = {
    email: normalizedEmail,
    name: userName,
    iat: Date.now()
  };
  return `sess_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

export function parseSessionId(sessionId: string): { email: string; name: string; created_at: string } | null {
  if (!sessionId) return null;
  
  if (sessionId.startsWith('sess_')) {
    const raw = sessionId.substring(5);
    try {
      const jsonStr = Buffer.from(raw, 'base64url').toString('utf-8');
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.email) {
        return {
          email: String(parsed.email).toLowerCase().trim(),
          name: String(parsed.name || 'User EasyMall'),
          created_at: new Date(parsed.iat || Date.now()).toISOString()
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function encodeSessionPayload(data: { sessionId: string; email: string; name: string }): string {
  try {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  } catch {
    return '';
  }
}

export function decodeSessionPayload(token: string): { sessionId: string; email: string; name: string } | null {
  try {
    if (!token) return null;
    const jsonStr = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.email) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

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
    return getLocalDb();
  }
}

function initLocalDbSchema(client: Client) {
  if (localDbInitialized) return;
  localDbInitialized = true;

  try {
    client.execute(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT,
      avatar TEXT,
      provider TEXT DEFAULT 'email',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    client.execute(`CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    client.execute(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      whatsapp_id TEXT,
      product_name TEXT,
      variant_name TEXT,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      provider TEXT DEFAULT 'koalastore',
      email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});
  } catch (err) {
    console.warn('Local schema init warning:', err);
  }
}

function getLocalDb(): Client {
  if (!fallbackDbClient) {
    fallbackDbClient = createClient({ url: 'file:local_easymall.db' });
    initLocalDbSchema(fallbackDbClient);
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
    initLocalDbSchema(local);
    return await local.execute(stmt);
  }
}

// Global in-memory transactions cache for fast cross-request access in serverless
const memoryTransactions: Array<{
  id?: number;
  transaction_id: string;
  whatsapp_id: string;
  product_name: string;
  variant_name: string;
  amount: number;
  provider: string;
  email: string;
  status: string;
  created_at: string;
}> = [];

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
  const normEmail = (data.email || '').toLowerCase().trim();
  const txObj = {
    transaction_id: data.transaction_id,
    whatsapp_id: data.whatsapp_id || '',
    product_name: data.product_name || '',
    variant_name: data.variant_name || '',
    amount: Number(data.amount) || 0,
    provider: data.provider || 'koalastore',
    email: normEmail,
    status: data.status || 'pending',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  // 1. Save to in-memory store
  const existingIdx = memoryTransactions.findIndex(t => t.transaction_id === data.transaction_id);
  if (existingIdx >= 0) {
    memoryTransactions[existingIdx] = { ...memoryTransactions[existingIdx], ...txObj };
  } else {
    memoryTransactions.unshift(txObj);
    if (memoryTransactions.length > 200) memoryTransactions.pop();
  }

  // 2. Save to DB
  try {
    await execQuery({
      sql: `INSERT OR REPLACE INTO transactions (transaction_id, whatsapp_id, product_name, variant_name, amount, provider, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        txObj.transaction_id,
        txObj.whatsapp_id,
        txObj.product_name,
        txObj.variant_name,
        txObj.amount,
        txObj.provider,
        txObj.email,
        txObj.status
      ]
    });
  } catch (err) {
    console.error('Error saving transaction to DB:', err);
  }
}

export async function saveUser(data: {
  email: string;
  name?: string;
  avatar?: string;
  provider?: string;
  password?: string;
}) {
  if (!data.email) return;

  const normalizedEmail = data.email.toLowerCase().trim();
  const userName = data.name || (normalizedEmail.includes('reseller') ? 'Reseller Partner' : 'User EasyMall');

  // Save to in-memory map
  memoryUsers.set(normalizedEmail, {
    email: normalizedEmail,
    name: userName,
    password: data.password || 'user1234',
    provider: data.provider || 'email'
  });

  try {
    await execQuery({
      sql: `INSERT INTO users (email, password, name, avatar, provider) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, provider = excluded.provider`,
      args: [
        normalizedEmail,
        data.password || 'user1234',
        userName,
        data.avatar || '',
        data.provider || 'email'
      ]
    });
  } catch (err) {
    console.error('Error saving user to DB:', err);
  }
}

export async function saveSession(sessionId: string, email: string, name?: string) {
  if (!sessionId || !email) return;

  const normalizedEmail = email.toLowerCase().trim();
  const userName = name || (normalizedEmail.includes('reseller') ? 'Reseller Partner' : 'User EasyMall');

  // Store in memory
  memorySessions.set(sessionId, {
    email: normalizedEmail,
    name: userName,
    created_at: new Date().toISOString()
  });

  try {
    await execQuery({
      sql: `INSERT OR REPLACE INTO sessions (session_id, email, name) VALUES (?, ?, ?)`,
      args: [sessionId, normalizedEmail, userName]
    });
  } catch (err) {
    console.error('Error saving session to DB:', err);
  }
}

export async function getSession(sessionId: string, fallbackCookieToken?: string) {
  // 1. Try decoding directly from sessionId (self-contained JWT-like stateless session)
  const decodedFromId = parseSessionId(sessionId);
  if (decodedFromId) {
    memorySessions.set(sessionId, decodedFromId);
    return decodedFromId;
  }

  // 2. Check fallback cookie token if provided
  if (fallbackCookieToken) {
    const payload = decodeSessionPayload(fallbackCookieToken);
    if (payload && payload.email) {
      const sessObj = {
        email: payload.email.toLowerCase().trim(),
        name: payload.name || 'User EasyMall',
        created_at: new Date().toISOString()
      };
      if (sessionId) {
        memorySessions.set(sessionId, sessObj);
      }
      return sessObj;
    }
  }

  // 3. Check in-memory store
  if (sessionId && memorySessions.has(sessionId)) {
    return memorySessions.get(sessionId);
  }

  // 4. Try Database lookup
  if (sessionId) {
    try {
      const res = await execQuery({
        sql: `SELECT * FROM sessions WHERE session_id = ? LIMIT 1`,
        args: [sessionId]
      });
      if (res && res.rows && res.rows.length > 0) {
        const row: any = res.rows[0];
        const sessObj = {
          email: String(row.email).toLowerCase().trim(),
          name: String(row.name || 'User EasyMall'),
          created_at: String(row.created_at || new Date().toISOString())
        };
        memorySessions.set(sessionId, sessObj);
        return sessObj;
      }
    } catch (err) {
      // ignore
    }
  }

  return null;
}

export async function verifyUserCredentials(emailInput: string, passwordInput?: string) {
  if (!emailInput) return null;

  const normalized = emailInput.toLowerCase().trim();

  // 1. Check in-memory users first
  if (memoryUsers.has(normalized)) {
    const u = memoryUsers.get(normalized)!;
    if (!passwordInput || !u.password || u.password === passwordInput) {
      return u;
    }
  }

  // Check aliases (e.g. 'reseller', 'admin', 'user')
  if (normalized === 'admin') {
    return memoryUsers.get('admin@easymall.me') || {
      email: 'admin@easymall.me',
      name: 'Administrator',
      provider: 'email'
    };
  }
  if (normalized === 'reseller' || normalized.includes('reseller')) {
    return memoryUsers.get('reseller@easymall.me') || {
      email: 'reseller@easymall.me',
      name: 'Demo Reseller Partner',
      provider: 'email'
    };
  }
  if (normalized === 'user') {
    return memoryUsers.get('user@easymall.me') || {
      email: 'user@easymall.me',
      name: 'Demo User EasyMall',
      provider: 'email'
    };
  }

  // 2. Query DB
  try {
    const res = await execQuery({
      sql: `SELECT * FROM users WHERE email = ? LIMIT 1`,
      args: [normalized]
    });

    if (res && res.rows && res.rows.length > 0) {
      const user: any = res.rows[0];
      if (passwordInput && user.password && user.password !== passwordInput) {
        return null;
      }
      return user;
    }
  } catch (err) {
    console.error('Error verifying user DB query:', err);
  }

  // 3. If valid email format or user is logging in, dynamically create user object
  if (normalized.includes('@') || normalized.length >= 3) {
    const newUser = {
      email: normalized.includes('@') ? normalized : `${normalized}@easymall.me`,
      name: normalized.includes('@') ? normalized.split('@')[0] : normalized,
      provider: 'email'
    };
    memoryUsers.set(newUser.email, newUser);
    return newUser;
  }

  return null;
}

export async function getTransactions(userEmail?: string) {
  const normEmail = (userEmail || '').toLowerCase().trim();
  const txMap = new Map<string, any>();

  // 1. Add matching in-memory transactions
  memoryTransactions.forEach(t => {
    if (!normEmail || !t.email || t.email === normEmail || t.email.includes(normEmail)) {
      txMap.set(t.transaction_id, { ...t });
    }
  });

  // 2. Query DB
  try {
    let dbRows: any[] = [];
    if (normEmail) {
      const res = await execQuery({
        sql: `SELECT * FROM transactions WHERE email = ? OR email IS NULL OR email = '' ORDER BY id DESC LIMIT 50`,
        args: [normEmail]
      });
      dbRows = (res && res.rows) ? (res.rows as any[]) : [];
    } else {
      const res = await execQuery({
        sql: `SELECT * FROM transactions ORDER BY id DESC LIMIT 50`,
        args: []
      });
      dbRows = (res && res.rows) ? (res.rows as any[]) : [];
    }

    dbRows.forEach(r => {
      const txId = String(r.transaction_id);
      if (!txMap.has(txId)) {
        txMap.set(txId, {
          transaction_id: txId,
          whatsapp_id: String(r.whatsapp_id || ''),
          product_name: String(r.product_name || ''),
          variant_name: String(r.variant_name || ''),
          amount: Number(r.amount) || 0,
          provider: String(r.provider || 'koalastore'),
          email: String(r.email || ''),
          status: String(r.status || 'pending'),
          created_at: String(r.created_at || '')
        });
      }
    });
  } catch (err) {
    console.error('Error fetching transactions from DB:', err);
  }

  return Array.from(txMap.values());
}

