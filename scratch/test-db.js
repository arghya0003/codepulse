require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const url = process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, '');
console.log('Connecting to:', url.replace(/:[^:@]+@/, ':***@'));

const sql = neon(url);

async function main() {
  try {
    const result = await sql`SELECT 1 as ok`;
    console.log('DB connection OK:', result);

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('Tables in DB:', tables.map(r => r.table_name));
  } catch (e) {
    console.error('DB ERROR:', e.message);
  }
}

main();
