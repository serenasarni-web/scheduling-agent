// ============================================
// SCHEDULING AGENT - SERVER PRINCIPALE
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.VERCEL_URL || 'https://scheduling-agent.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// ============================================
// DATABASE CONNECTION
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -------- USERS --------
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // TODO: Hash password with bcrypt
    const result = await pool.query(
      'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, name, password]
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
    
    // TODO: Verify password with bcrypt
    const user = result.rows[0];
    req.session.userId = user.id;
    
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // TODO: Fetch user from database
  res.json({ id: req.session.userId });
});

// -------- SCHEDULE (Fascia oraria) --------
app.get('/api/schedule', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_schedules WHERE user_id = $1',
      [req.session.userId]
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
      [req.session.userId, day_of_week, start_time, end_time, gap_minutes || 15]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- CALL TYPES --------
app.get('/api/call-types', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM call_types WHERE user_id = $1 ORDER BY duration_minutes',
      [req.session.userId]
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
      [req.session.userId, name, duration_minutes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- CLIENTS --------
app.get('/api/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { name, email, phone, notes, preferred_call_type, preferred_hours } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clients 
       (user_id, name, email, phone, notes, preferred_call_type, preferred_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [req.session.userId, name, email, phone, notes, preferred_call_type, preferred_hours]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- APPOINTMENTS --------
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM appointments WHERE user_id = $1 ORDER BY start_time DESC',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { 
      client_id, 
      call_type_id, 
      start_time, 
      duration_minutes, 
      title, 
      description,
      google_event_id,
      calendly_event_id,
      meet_link,
      status
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO appointments 
       (user_id, client_id, call_type_id, start_time, duration_minutes, 
        title, description, google_event_id, calendly_event_id, meet_link, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        req.session.userId, client_id, call_type_id, start_time, duration_minutes,
        title, description, google_event_id, calendly_event_id, meet_link, status || 'pending'
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confirmed_at, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE appointments 
       SET status = COALESCE($1, status), 
           confirmed_at = COALESCE($2, confirmed_at),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [status, confirmed_at, notes, id, req.session.userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- AVAILABILITY (Slot disponibili) --------
app.post('/api/availability/generate', async (req, res) => {
  try {
    const { period, call_type_id, days } = req.body;
    
    // TODO: Logica per generare slot disponibili
    // Considera:
    // 1. Schedule dell'utente (fascia oraria per giorno)
    // 2. Durata della call type
    // 3. Gap tra le call (15 min)
    // 4. Appointment già prenotati
    
    const slots = generateAvailableSlots(
      req.session.userId,
      period,
      call_type_id,
      days
    );
    
    res.json(slots);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- GOOGLE CALENDAR INTEGRATION --------
app.get('/api/google/auth-url', (req, res) => {
  try {
    // TODO: Generare URL di autorizzazione Google OAuth
    const authUrl = generateGoogleAuthUrl();
    res.json({ auth_url: authUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // TODO: Scambiare code con access token
    // Salvare token nel database
    // Sincronizzare calendario
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/google/sync', async (req, res) => {
  try {
    // TODO: Sincronizzare eventi da Google Calendar
    
    res.json({ synced: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- CALENDLY INTEGRATION --------
app.post('/api/calendly/create-event', async (req, res) => {
  try {
    const { 
      appointment_id,
      start_time, 
      duration_minutes, 
      client_email, 
      title 
    } = req.body;
    
    // TODO: Creare evento su Calendly
    // Collegare con Google Meet automaticamente
    
    res.json({ 
      success: true,
      calendly_event_url: 'https://calendly.com/...'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- MESSAGES (Messaggi WhatsApp) --------
app.post('/api/messages/generate', async (req, res) => {
  try {
    const { client_id, slots, call_type } = req.body;
    
    // Fetch client details
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1',
      [client_id]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Generate message
    const message = generateWhatsAppMessage(client.name, slots, call_type);
    
    res.json({ message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------- AI SUGGESTIONS --------
app.get('/api/ai/suggestions', async (req, res) => {
  try {
    // TODO: Analizzare pattern di appuntamenti
    // Suggerire orari migliori in base alla storia
    
    const suggestions = await generateAISuggestions(req.session.userId);
    
    res.json(suggestions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateAvailableSlots(userId, period, callTypeId, days) {
  // TODO: Implementare logica di generazione slot
  return [];
}

function generateGoogleAuthUrl() {
  // TODO: Generare URL OAuth Google
  return '';
}

function generateWhatsAppMessage(clientName, slots, callType) {
  let slotsText = slots.map(slot => `⏰ ${slot}`).join('\n');
  
  return `Ciao ${clientName}! 👋
Ecco i miei slot disponibili per una call:

📅 ${slotsText}

Quale orario preferisci?

🔗 Link: https://calendly.com/tuolinkofittizio`;
}

async function generateAISuggestions(userId) {
  // TODO: Usare Claude API per suggerimenti intelligenti
  return [];
}

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Scheduling Agent Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
