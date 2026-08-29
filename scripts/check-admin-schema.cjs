const { Pool } = require("pg");

const requiredTables = {
  user_groups: [
    "id", "name", "icon", "color", "effect", "description",
    "daily_ai_limit", "j_coin_bonus", "max_bonus_cap", "is_active",
    "metadata", "created_at",
  ],
  user_group_members: [
    "id", "user_id", "group_id", "assigned_by", "assigned_reason",
    "expires_at", "revoked_at", "revoked_by", "revocation_reason", "created_at",
  ],
  j_coin_transactions: [
    "id", "user_id", "amount", "type", "reason", "admin_id", "event_id",
    "metadata", "created_at",
  ],
  honor_notifications: [
    "id", "user_id", "type", "target_id", "title", "content", "is_seen", "created_at",
  ],
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 未設定；未連線到任何資料庫，沒有進行修改。");
    process.exitCode = 2;
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name, ordinal_position
      `, [Object.keys(requiredTables)]);

      const columnsByTable = new Map();
      for (const row of result.rows) {
        if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
        columnsByTable.get(row.table_name).add(row.column_name);
      }

      let hasProblems = false;
      for (const [table, requiredColumns] of Object.entries(requiredTables)) {
        const actualColumns = columnsByTable.get(table) || new Set();
        const missing = requiredColumns.filter((column) => !actualColumns.has(column));
        if (missing.length > 0) {
          hasProblems = true;
          console.log(`${table}: 缺少 ${missing.join(", ")}`);
        } else {
          console.log(`${table}: OK`);
        }
      }

      if (hasProblems) {
        console.error("Schema 尚未完整同步，請先執行 drizzle/0004_repair_admin_identity_schema.sql。");
        process.exitCode = 1;
      } else {
        console.log("管理員身份組、J 幣與榮譽通知 Schema 已完整。");
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("無法檢查資料庫；未進行修改。", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
