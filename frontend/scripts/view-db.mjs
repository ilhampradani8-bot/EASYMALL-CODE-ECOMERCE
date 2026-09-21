import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectDb(targetUrl, name) {
  console.log(`\n==================================================`);
  console.log(` 📊 DATABASE CONTENTS: ${name}`);
  console.log(`==================================================`);

  try {
    const client = createClient({ url: targetUrl });
    const tables = ['users', 'sessions', 'transactions'];

    for (const table of tables) {
      try {
        const res = await client.execute(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 50`);
        console.log(`\n📦 TABEL [${table.toUpperCase()}] (${res.rows.length} Baris Data):`);
        if (res.rows.length === 0) {
          console.log('   (Belum ada data)');
        } else {
          console.table(res.rows);
        }
      } catch (err) {
        console.log(`   (Gagal membaca tabel '${table}': ${err.message})`);
      }
    }
  } catch (err) {
    console.error(`✗ Gagal membuka database ${name}:`, err.message);
  }
}

async function main() {
  await inspectDb('file:local_easymall.db', 'SQLite Database Lokal (local_easymall.db)');
}

main();
