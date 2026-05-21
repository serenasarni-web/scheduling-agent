require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    const sqlPath = path.join(__dirname, '..', 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    const queries = sql.split(';').filter(q => q.trim().length > 0);
    
    for (const query of queries) {
      try {
        await pool.query(query);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('Error:', error.message);
        }
      }
    }
    
    console.log('✅ Database migration completed successfully!');
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection test:', result.rows[0].now);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
