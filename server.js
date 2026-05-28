const express = require('express');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.json());
app.use(express.static('public'));

// CLIENTS
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE user_id = $1', [1]);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { user_id, name, email, phone, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO clients (user_id, name, email, phone, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, name, email, phone, notes]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { name, email, phone, notes } = req.body;
    const result = await pool.query(
      'UPDATE clients SET name = $1, email = $2, phone = $3, notes = $4 WHERE id = $5 RETURNING *',
      [name, email, phone, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// APPOINTMENTS
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appointments WHERE user_id = $1 ORDER BY start_time DESC', [1]);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { user_id, client_id, call_type_id, title, start_time, duration_minutes, category } = req.body;
    const result = await pool.query(
      'INSERT INTO appointments (user_id, client_id, call_type_id, title, start_time, duration_minutes, category) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, client_id, call_type_id, title, start_time, duration_minutes, category || 'work_consulenza']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { title, start_time, duration_minutes, category } = req.body;
    const result = await pool.query(
      'UPDATE appointments SET title = $1, start_time = $2, duration_minutes = $3, category = $4 WHERE id = $5 RETURNING *',
      [title, start_time, duration_minutes, category || 'work_consulenza', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GOOGLE SYNC
const { pushToGoogle, deleteFromGoogle, oauth2Client } = require('./scripts/google-calendar-sync');

app.post('/api/sync/google/:aptId', async (req, res) => {
  try {
    const { aptId } = req.params;
    const { googleToken } = req.body;

    const apt = await pool.query('SELECT * FROM appointments WHERE id = $1', [aptId]);
    if (!apt.rows[0]) {
      return res.status(404).json({ error: 'Appuntamento non trovato' });
    }

    const googleEventId = await pushToGoogle(apt.rows[0], googleToken);
    
    if (googleEventId) {
      await pool.query(
        'UPDATE appointments SET google_event_id = $1 WHERE id = $2',
        [googleEventId, aptId]
      );
      res.json({ success: true, googleEventId });
    } else {
      res.status(400).json({ error: 'Errore sincronizzazione Google' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/sync/google/:aptId', async (req, res) => {
  try {
    const { aptId } = req.params;
    const { googleToken } = req.body;

    const apt = await pool.query('SELECT google_event_id FROM appointments WHERE id = $1', [aptId]);
    
    if (!apt.rows[0]?.google_event_id) {
      return res.status(400).json({ error: 'Appuntamento non sincronizzato' });
    }

    const deleted = await deleteFromGoogle(apt.rows[0].google_event_id, googleToken);
    
    if (deleted) {
      await pool.query(
        'UPDATE appointments SET google_event_id = NULL WHERE id = $1',
        [aptId]
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Errore eliminazione da Google' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GOOGLE OAUTH
app.get('/api/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
  });
  res.json({ authUrl });
});

app.post('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    
    await pool.query(
      'UPDATE users SET google_token = $1 WHERE id = $2',
      [tokens.access_token, 1]
    );

    res.json({ success: true, token: tokens.access_token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/auth/google/status', async (req, res) => {
  try {
    const user = await pool.query('SELECT google_token FROM users WHERE id = $1', [1]);
    res.json({ connected: !!user.rows[0]?.google_token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

// GOOGLE CALENDAR READ SYNC
const { readFromGoogle } = require('./scripts/google-sync-read');

app.post('/api/sync/read-google', async (req, res) => {
  try {
    const count = await readFromGoogle('primary');
    res.json({ success: true, syncedCount: count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Auto-sync ogni 5 minuti
setInterval(async () => {
  console.log('⏰ Polling Google Calendar...');
  await readFromGoogle('primary');
}, 5 * 60 * 1000); // 5 minuti
