const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const CALENDLY_API = 'https://api.calendly.com';

async function createCalendlyEvent(appointment) {
  try {
    const response = await axios.post(
      `${CALENDLY_API}/scheduled_events`,
      {
        event_type_uri: process.env.CALENDLY_USER_URI,
        start_time: new Date(appointment.start_time).toISOString(),
        invitees_fast_add: [
          {
            name: appointment.client_name,
            email: appointment.client_email
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const calendlyUrl = response.data.resource.calendar_event_uri;
    
    await pool.query(
      'UPDATE appointments SET calendly_event_id = $1, meet_link = $2 WHERE id = $3',
      [response.data.resource.uri, calendlyUrl, appointment.id]
    );
    
    console.log('✅ Evento Calendly creato');
    return calendlyUrl;
  } catch (error) {
    console.error('❌ Errore Calendly:', error.response?.data || error.message);
    return null;
  }
}

async function getCalendlyEvents() {
  try {
    const response = await axios.get(
      `${CALENDLY_API}/scheduled_events`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`
        }
      }
    );
    
    return response.data.collection;
  } catch (error) {
    console.error('❌ Errore lettura Calendly:', error.message);
    return [];
  }
}

module.exports = { createCalendlyEvent, getCalendlyEvents };
