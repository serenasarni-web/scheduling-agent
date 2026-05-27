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
      [user_id, client_id, call_type_id, title, start_time, duration_minutes, category || 'strategica']
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
      [title, start_time, duration_minutes, category || 'strategica', req.params.id]
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

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
