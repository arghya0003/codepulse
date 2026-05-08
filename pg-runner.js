const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, "");
  console.log("Connecting using standard PG driver to bypass fetch errors...");
  
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to database");
    
    const sqlPath = path.join(__dirname, "db/migrations/0001_initial_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    
    console.log("Running migration script...");
    await client.query(sql);
    
    // Also insert the clerk user row explicitly
    const insertSql = `
      INSERT INTO users (clerk_id, email, first_name, username)
      VALUES ('user_3CPhdrFH5coPzHO2Zx1oEz5l5FF', 'arghyabhatt2003@gmail.com', 'Arghya', 'arghya0003')
      ON CONFLICT (clerk_id) DO UPDATE SET
        username = EXCLUDED.username,
        updated_at = now();
    `;
    await client.query(insertSql);
    
    console.log("✅ Database successfully built and user successfully inserted");
  } catch (err) {
    console.error("❌ Database execution failed:", err);
  } finally {
    await client.end();
  }
}

run();
