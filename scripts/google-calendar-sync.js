const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Carica le credenziali del Service Account
const serviceAccountKey = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/google-service-account.json'))
);

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
});

async function pushToGoogle(appointment, userEmail) {
  try {
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

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

    const response = await calendar.events.insert({
      calendarId: userEmail || 'primary',
      resource: event
    });

    console.log('✅ Sincronizzato a Google Calendar:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('❌ Errore Google:', error.message);
    return null;
  }
}

async function deleteFromGoogle(googleEventId, userEmail) {
  try {
    if (!googleEventId) return false;

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    await calendar.events.delete({
      calendarId: userEmail || 'primary',
      eventId: googleEventId
    });

    console.log('✅ Eliminato da Google Calendar:', googleEventId);
    return true;
  } catch (error) {
    console.error('❌ Errore eliminazione:', error.message);
    return false;
  }
}

module.exports = { pushToGoogle, deleteFromGoogle };
