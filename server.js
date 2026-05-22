require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================
// API ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, password, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_schedules ORDER BY day_of_week'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, gap_minutes } = req.body;
    const result = await pool.query(
      `INSERT INTO user_schedules 
       (user_id, day_of_week, start_time, end_time, gap_minutes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [1, day_of_week, start_time, end_time, gap_minutes || 15]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Call Types
app.get('/api/call-types', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM call_types WHERE user_id = 1 ORDER BY duration_minutes'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/call-types', async (req, res) => {
  try {
    const { name, duration_minutes } = req.body;
    const result = await pool.query(
      `INSERT INTO call_types 
       (user_id, name, duration_minutes) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [1, name, duration_minutes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Clients
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = 1 ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, email, phone, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO clients 
       (user_id, name, email, phone, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [1, name, email, phone, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM appointments WHERE user_id = 1 ORDER BY start_time DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { client_id, call_type_id, start_time, duration_minutes, title } = req.body;
    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, client_id, call_type_id, start_time, duration_minutes, title, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [1, client_id, call_type_id, start_time, duration_minutes, title, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve React app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Scheduling Agent Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

const { syncGoogleCalendar, createGoogleCalendarEvent } = require('./scripts/google-calendar');

app.get('/api/google/auth-url', (req, res) => {
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });
  
  res.json({ auth_url: authUrl });
});

app.post('/api/google/callback', async (req, res) => {
  try {
    const { code, userId } = req.body;
    const { google } = require('googleapis');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    await pool.query(
      'UPDATE users SET google_token = $1 WHERE id = $2',
      [tokens.access_token, userId]
    );
    
    await syncGoogleCalendar(userId, tokens.access_token);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/google/sync', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await pool.query('SELECT google_token FROM users WHERE id = $1', [userId]);
    
    if (!user.rows[0]?.google_token) {
      return res.status(400).json({ error: 'Google non collegato' });
    }
    
    await syncGoogleCalendar(userId, user.rows[0].google_token);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
