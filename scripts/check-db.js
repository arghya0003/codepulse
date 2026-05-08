const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_LdSKkE74sGtb@ep-plain-base-ank2lwhq-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const r = await sql`SELECT 1 as ping`;
    console.log('DB connection OK:', r);

    // Check what tables exist
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('Tables:', tables.map(t => t.table_name));

    // Check users
    const users = await sql`SELECT id, clerk_id FROM users LIMIT 3`;
    console.log('Users:', users);

  } catch(e) {
    console.error('Error:', e.message);
  }
}

main();
