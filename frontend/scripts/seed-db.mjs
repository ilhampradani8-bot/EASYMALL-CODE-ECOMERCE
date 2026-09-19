import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let envVars = {};
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
} catch (e) {}

const rawUrl = envVars.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || 'https://easymall-ilhampradani8-bot.aws-ap-south-1.turso.io';
const url = rawUrl.replace('libsql://', 'https://');
const authToken = (envVars.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJMcUVKWWJQbEVmR0dybjd1d0FDRDhRIiwib3JnX2lkIjoxMDAwMjQ4OTQ4fQ.BrWGudcY6W6a4maX5ZJ4A-uzgX7ILztDxqi7A38HGuUSozRDEgLD1NDP8DwyJVFu2XdweROXPQV4plQKNUkyBg').trim();

console.log('Connecting to Turso Database:', url);

async function runSeed(targetUrl, targetAuthToken, name) {
  console.log(`\n--- Seeding ${name} (${targetUrl}) ---`);
  try {
    const client = createClient({
      url: targetUrl,
      authToken: targetAuthToken || undefined
    });

    const schemaPath = path.join(__dirname, '../src/lib/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log(`✓ [${name}] Tables and indexes created successfully!`);

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

    console.log(`✓ [${name}] Default accounts seeded:`);
    console.log('  - User: user@easymall.me / user1234');
    console.log('  - Reseller: reseller@easymall.me / reseller1234');
    return true;
  } catch (err) {
    console.error(`✗ [${name}] Failed:`, err.message || err);
    return false;
  }
}

async function main() {
  const tursoSuccess = await runSeed(url, authToken, 'Turso Cloud DB');
  const localSuccess = await runSeed('file:local_easymall.db', undefined, 'Local SQLite DB');

  if (tursoSuccess || localSuccess) {
    console.log('\n✓ Database seeding completed!');
    process.exit(0);
  } else {
    console.error('\n✗ Database seeding failed for all targets.');
    process.exit(1);
  }
}

main();
