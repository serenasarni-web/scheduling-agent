const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
});

async function pushToGoogle(appointment, userEmail = 'primary') {
  try {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const eventData = {
      summary: appointment.title,
      description: `Categoria: ${appointment.category}\nDurata: ${appointment.duration_minutes} min`,
      start: {
        dateTime: new Date(appointment.start_time).toISOString(),
        timeZone: 'Europe/Rome'
      },
      end: {
        dateTime: new Date(new Date(appointment.start_time).getTime() + appointment.duration_minutes * 60000).toISOString(),
        timeZone: 'Europe/Rome'
      }
    };

    // Se ha già un google_event_id, aggiorna; altrimenti crea
    if (appointment.google_event_id) {
      await calendar.events.update({
        calendarId: userEmail,
        eventId: appointment.google_event_id,
        resource: eventData
      });
      console.log(`✅ Evento aggiornato su Google: ${appointment.title}`);
    } else {
      const response = await calendar.events.insert({
        calendarId: userEmail,
        resource: eventData
      });
      console.log(`✅ Evento creato su Google: ${appointment.title} (ID: ${response.data.id})`);
      return response.data.id;
    }
  } catch (error) {
    console.error('❌ Errore sync Google:', error.message);
    throw error;
  }
}

async function deleteFromGoogle(googleEventId, userEmail = 'primary') {
  try {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    await calendar.events.delete({
      calendarId: userEmail,
      eventId: googleEventId
    });
    console.log(`✅ Evento eliminato da Google: ${googleEventId}`);
  } catch (error) {
    console.error('❌ Errore eliminazione Google:', error.message);
    throw error;
  }
}

module.exports = { pushToGoogle, deleteFromGoogle };
