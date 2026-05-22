const { google } = require('googleapis');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function syncGoogleCalendar(userId, accessToken) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    for (const event of events.data.items || []) {
      await pool.query(
        `INSERT INTO appointments 
         (user_id, title, start_time, duration_minutes, google_event_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (google_event_id) DO NOTHING`,
        [
          userId,
          event.summary,
          event.start.dateTime || event.start.date,
          Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000),
          event.id,
          'confirmed'
        ]
      );
    }
    
    console.log('✅ Google Calendar sincronizzato');
    return true;
  } catch (error) {
    console.error('❌ Errore sync Google Calendar:', error);
    return false;
  }
}

async function createGoogleCalendarEvent(userId, appointment) {
  try {
    const user = await pool.query('SELECT google_token FROM users WHERE id = $1', [userId]);
    if (!user.rows[0]?.google_token) return null;
    
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({ access_token: user.rows[0].google_token });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: appointment.title,
        description: appointment.description,
        start: {
          dateTime: new Date(appointment.start_time).toISOString()
        },
        end: {
          dateTime: new Date(new Date(appointment.start_time).getTime() + appointment.duration_minutes * 60000).toISOString()
        }
      }
    });
    
    await pool.query(
      'UPDATE appointments SET google_event_id = $1 WHERE id = $2',
      [event.data.id, appointment.id]
    );
    
    return event.data;
  } catch (error) {
    console.error('❌ Errore creazione Google Calendar:', error);
    return null;
  }
}

module.exports = { syncGoogleCalendar, createGoogleCalendarEvent };
