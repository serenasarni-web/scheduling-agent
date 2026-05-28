const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
});

async function readFromGoogle() {
  try {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const calendarId = 'serena.sarni@gmail.com';

    // Leggi SOLO gli eventi FUTURI (da oggi in poi)
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    console.log(`📖 Trovati ${events.length} eventi FUTURI`);

    let imported = 0;
    for (const event of events) {
      if (!event.summary) continue;

      const existing = await pool.query(
        'SELECT id FROM appointments WHERE google_event_id = $1',
        [event.id]
      );

      if (!existing.rows.length) {
        const title = event.summary || 'Evento';
        const startTime = new Date(event.start.dateTime || event.start.date).toISOString();
        const endTime = new Date(event.end.dateTime || event.end.date).toISOString();
        const durationMinutes = Math.max(Math.round((new Date(endTime) - new Date(startTime)) / 60000), 30);

        try {
          await pool.query(
            'INSERT INTO appointments (user_id, title, start_time, duration_minutes, google_event_id, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [1, title, startTime, durationMinutes, event.id, 'work_consulenza', 'pending']
          );
          console.log(`✅ Importato: ${title}`);
          imported++;
        } catch (error) {
          console.error(`❌ Errore: ${error.message}`);
        }
      }
    }

    console.log(`📥 Importati ${imported} nuovi eventi FUTURI`);
    return imported;
  } catch (error) {
    console.error('❌ Errore lettura:', error.message);
    return 0;
  }
}

module.exports = { readFromGoogle };
