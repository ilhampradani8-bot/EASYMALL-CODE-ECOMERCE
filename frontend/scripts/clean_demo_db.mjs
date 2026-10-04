import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      envVars[key] = value.trim();
    }
  });
}

const url = envVars.TURSO_DATABASE_URL || 'file:' + path.join(__dirname, '../local_easymall.db');
const authToken = envVars.TURSO_AUTH_TOKEN || undefined;

console.log('Connecting to DB:', url);

async function run() {
  try {
    const client = createClient({
      url,
      authToken
    });

    // 1. Check existing users
    const users = await client.execute("SELECT id, email, name FROM users");
    console.log("Current Users in DB (" + users.rows.length + "):");
    console.log(users.rows);

    // 2. Delete demo users
    const deleteRes = await client.execute({
      sql: "DELETE FROM users WHERE email LIKE '%demo%' OR name LIKE '%demo%' OR email = 'user@easymall.me' OR email = 'reseller@easymall.me'",
      args: []
    });
    console.log("Deleted demo users from Primary DB:", deleteRes);

    // 3. Also check local SQLite DB
    try {
      const localClient = createClient({
        url: 'file:' + path.join(__dirname, '../local_easymall.db')
      });
      await localClient.execute({
        sql: "DELETE FROM users WHERE email LIKE '%demo%' OR name LIKE '%demo%' OR email = 'user@easymall.me' OR email = 'reseller@easymall.me'",
        args: []
      });
      console.log("Cleaned local SQLite DB as well.");
    } catch (e) {
      console.log("Local SQLite clean info:", e.message);
    }

    // 4. Verify remaining
    const remaining = await client.execute("SELECT id, email, name FROM users");
    console.log("Remaining Users (" + remaining.rows.length + "):", remaining.rows);

  } catch (err) {
    console.error("DB Error:", err);
  }
}

run();
