const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Sincronizza appuntamento DA database A Google Calendar
async function pushToGoogle(appointment, googleAccessToken) {
  try {
    if (!googleAccessToken) {
      console.log('❌ Nessun Google token disponibile');
      return null;
    }

    const event = {
      summary: `${appointment.title} [${appointment.category}]`,
      description: `Categoria: ${appointment.category}\nDurata: ${appointment.duration_minutes} minuti`,
      start: {
        dateTime: appointment.start_time,
        timeZone: 'Europe/Rome'
      },
      end: {
        dateTime: new Date(new Date(appointment.start_time).getTime() + appointment.duration_minutes * 60000).toISOString(),
        timeZone: 'Europe/Rome'
      }
    };

    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      event,
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Sincronizzato a Google:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('❌ Errore Google:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

// Elimina appuntamento DA Google Calendar
async function deleteFromGoogle(googleEventId, googleAccessToken) {
  try {
    if (!googleAccessToken || !googleEventId) return false;

    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      }
    );

    console.log('✅ Eliminato da Google:', googleEventId);
    return true;
  } catch (error) {
    console.error('❌ Errore eliminazione Google:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

module.exports = { pushToGoogle, deleteFromGoogle };
