const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');

    // Drop tutte le tabelle (ATTENZIONE: cancella tutto!)
    await pool.query(`
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS call_types CASCADE;
      DROP TABLE IF EXISTS clients CASCADE;
      DROP TABLE IF EXISTS user_schedules CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('🗑️  Old tables dropped');

    // Crea tabella users (SENZA password)
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        google_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Crea tabella clients
    await pool.query(`
      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Clients table created');

    // Crea tabella call_types
    await pool.query(`
      CREATE TABLE call_types (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(100),
        duration_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Call types table created');

    // Crea tabella appointments
    await pool.query(`
      CREATE TABLE appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        client_id INTEGER REFERENCES clients(id),
        call_type_id INTEGER REFERENCES call_types(id),
        title VARCHAR(255),
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        google_event_id VARCHAR(255),
        calendly_event_id VARCHAR(255),
        reminder_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Appointments table created');

    // Crea tabella user_schedules
    await pool.query(`
      CREATE TABLE user_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        day_of_week INTEGER,
        start_time TIME,
        end_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User schedules table created');

    // Insert default user
    await pool.query(`
      INSERT INTO users (name, email) 
      VALUES ('Barny', 'barny@example.com')
    `);
    console.log('✅ Default user created');

    // Insert default call types
    await pool.query(`
      INSERT INTO call_types (user_id, name, duration_minutes) 
      VALUES (1, 'Strategica', 90), (1, 'Consulenza', 60), (1, 'Allineamento', 30), (1, 'Personalizzata', 45)
    `);
    console.log('✅ Call types inserted');

    // Insert sample client
    await pool.query(`
      INSERT INTO clients (user_id, name, email, phone)
      VALUES (1, 'Cliente Esempio', 'cliente@example.com', '+39 123 456 7890')
    `);
    console.log('✅ Sample client inserted');

    // Insert sample appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await pool.query(`
      INSERT INTO appointments (user_id, client_id, call_type_id, title, start_time, duration_minutes, status)
      VALUES (1, 1, 1, 'Riunione Strategica', $1, 90, 'pending')
    `, [tomorrow.toISOString()]);
    console.log('✅ Sample appointment inserted');

    console.log('\n✅ Database migration completed successfully!');
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection test:', result.rows[0].now);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

migrate();
