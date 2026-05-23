const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const client = new Anthropic();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function getAISuggestions(userId) {
  try {
    // Leggi gli appuntamenti dell'utente
    const result = await pool.query(
      `SELECT * FROM appointments 
       WHERE user_id = $1 
       ORDER BY start_time DESC 
       LIMIT 10`,
      [userId]
    );

    const appointments = result.rows;

    if (appointments.length === 0) {
      return { suggestions: 'Nessun appuntamento ancora. Crea il primo!' };
    }

    // Analizza con Claude
    const appointmentText = appointments
      .map(apt => `${apt.title} - ${new Date(apt.start_time).toLocaleString('it-IT')} (${apt.duration_minutes} min)`)
      .join('\n');

    const message = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analizza questi appuntamenti e suggerisci come ottimizzare il calendario:\n\n${appointmentText}\n\nDa suggerimenti pratici in italiano.`
        }
      ]
    });

    return {
      suggestions: message.content[0].type === 'text' ? message.content[0].text : 'Errore nella risposta'
    };
  } catch (error) {
    console.error('❌ Errore AI Suggestions:', error);
    return { error: error.message };
  }
}

module.exports = { getAISuggestions };
