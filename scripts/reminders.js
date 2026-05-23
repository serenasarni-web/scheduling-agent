const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configurazione email (usa Gmail o servizio simile)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendReminders() {
  try {
    // Trova appuntamenti nei prossimi 60 minuti
    const result = await pool.query(
      `SELECT a.*, c.email as client_email, c.name as client_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.status = 'pending'
       AND a.start_time > NOW()
       AND a.start_time < NOW() + INTERVAL '1 hour'
       AND (a.reminder_sent = false OR a.reminder_sent IS NULL)`
    );

    for (const apt of result.rows) {
      // Invia email al cliente
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: apt.client_email,
        subject: `⏰ Reminder: ${apt.title} tra 1 ora!`,
        html: `
          <h2>Ciao ${apt.client_name}!</h2>
          <p>Reminder: hai un appuntamento <strong>${apt.title}</strong> tra <strong>1 ora</strong></p>
          <p>Orario: <strong>${new Date(apt.start_time).toLocaleString('it-IT')}</strong></p>
          <p>Durata: ${apt.duration_minutes} minuti</p>
          <p>Se non puoi partecipare, contattaci al più presto!</p>
        `
      });

      // Marca reminder come inviato
      await pool.query(
        'UPDATE appointments SET reminder_sent = true WHERE id = $1',
        [apt.id]
      );

      console.log(`✅ Reminder inviato per: ${apt.title}`);
    }
  } catch (error) {
    console.error('❌ Errore invio reminder:', error);
  }
}

async function startReminderService() {
  console.log('🔔 Reminder Service avviato');
  // Controlla ogni 5 minuti
  setInterval(sendReminders, 5 * 60 * 1000);
  // Primo check subito
  await sendReminders();
}

module.exports = { startReminderService, sendReminders };
