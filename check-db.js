const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    
    console.log("--- Tables ---");
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(tables.rows.map(r => r.table_name).join(", "));

    console.log("\n--- User Columns ---");
    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log(userColumns.rows.map(r => r.column_name).join(", "));

    client.release();
  } catch (e) {
    console.error("DB Check Failed:", e);
  } finally {
    await pool.end();
  }
}

check();
