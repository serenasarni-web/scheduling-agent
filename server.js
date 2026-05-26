require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// HEALTH
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// CLIENTS
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE user_id = 1 ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { user_id, name, email, phone, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO clients (user_id, name, email, phone, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id || 1, name, email, phone, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes } = req.body;
    const result = await pool.query(
      `UPDATE clients SET name = $1, email = $2, phone = $3, notes = $4 WHERE id = $5 RETURNING *`,
      [name, email, phone, notes, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// APPOINTMENTS
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments WHERE user_id = 1 ORDER BY start_time DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { user_id, client_id, call_type_id, title, start_time, duration_minutes } = req.body;
    const result = await pool.query(
      `INSERT INTO appointments (user_id, client_id, call_type_id, title, start_time, duration_minutes, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [user_id || 1, client_id, call_type_id, title, start_time, duration_minutes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// AI SUGGESTIONS
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

async function getAISuggestions(userId) {
  try {
    const result = await pool.query(
      `SELECT * FROM appointments WHERE user_id = $1 ORDER BY start_time DESC LIMIT 10`,
      [userId]
    );
    const appointments = result.rows;
    if (appointments.length === 0) {
      return { suggestions: 'Nessun appuntamento ancora.' };
    }
    const appointmentText = appointments.map(apt => `${apt.title} - ${new Date(apt.start_time).toLocaleString('it-IT')} (${apt.duration_minutes} min)`).join('\n');
    const message = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analizza questi appuntamenti e suggerisci come ottimizzare:\n\n${appointmentText}\n\nDa suggerimenti in italiano.`
      }]
    });
    return { suggestions: message.content[0].text };
  } catch (error) {
    return { error: error.message };
  }
}

app.get('/api/ai/suggestions', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const suggestions = await getAISuggestions(userId);
    res.json(suggestions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Scheduling Agent Server running on port ${PORT}`);
});
