// ============================================
// DATABASE SEEDING SCRIPT
// ============================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Crea utente demo
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['demo@scheduling-agent.com', 'demo', 'Demo User']
    );
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Created demo user (ID: ${userId})`);
    
    // Crea schedule demo (Lunedì e Mercoledì: 9:30-12:30, 15:00-18:00)
    const schedules = [
      [userId, 1, '09:30', '12:30', 15], // Lunedì
      [userId, 1, '15:00', '18:00', 15],
      [userId, 2, '17:00', '19:00', 15], // Martedì
      [userId, 3, '09:30', '12:30', 15], // Mercoledì
      [userId, 3, '15:00', '18:00', 15],
      [userId, 4, '17:00', '19:00', 15], // Giovedì
      [userId, 5, '09:30', '12:30', 15], // Venerdì
    ];
    
    for (const schedule of schedules) {
      await pool.query(
        `INSERT INTO user_schedules 
         (user_id, day_of_week, start_time, end_time, gap_minutes) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, day_of_week) DO NOTHING`,
        schedule
      );
    }
    
    console.log('✅ Created demo schedules');
    
    // Crea call types
    const callTypes = [
      [userId, 'Strategica', 90, '💼'],
      [userId, 'Consulenza', 60, '📞'],
      [userId, 'Allineamento', 30, '📋'],
      [userId, 'Personalizzata', 45, '⚡'],
    ];
    
    for (const [uId, name, duration, emoji] of callTypes) {
      await pool.query(
        `INSERT INTO call_types (user_id, name, duration_minutes, emoji) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [uId, name, duration, emoji]
      );
    }
    
    console.log('✅ Created demo call types');
    
    // Crea clienti demo
    const clients = [
      [userId, 'Marco Rossi', 'marco@example.com', '+39 3XX XXX XXXX', 'TechCorp', 'Cliente strategico', 'Consulenza'],
      [userId, 'Anna Bianchi', 'anna@example.com', '+39 3XX XXX XXXX', 'StartupXYZ', 'Progetto nuovo', 'Strategica'],
      [userId, 'Luigi Ferrari', 'luigi@example.com', '+39 3XX XXX XXXX', 'Freelancer', 'Supporto tecnico', 'Allineamento'],
    ];
    
    for (const [uId, name, email, phone, company, notes, callType] of clients) {
      await pool.query(
        `INSERT INTO clients 
         (user_id, name, email, phone, company, notes, preferred_call_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [uId, name, email, phone, company, notes, callType]
      );
    }
    
    console.log('✅ Created demo clients');
    
    console.log('🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
