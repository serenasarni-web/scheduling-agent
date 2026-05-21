# 🚀 Scheduling Agent - AI Agente Organizzazione Impegni

Agente AI completo per organizzare impegni, sincronizzare con Google Calendar, Calendly, creare Google Meet e gestire reminder automatici.

## 📋 Requisiti

- Node.js 18+
- Account Vercel
- Account Neon (PostgreSQL)
- Account Google Cloud
- Account Calendly

## 🔧 Setup Locale

### 1. Clone il repository

```bash
git clone https://github.com/serenasarni-1261/scheduling-agent.git
cd scheduling-agent
```

### 2. Installa dipendenze

```bash
npm install
```

### 3. Crea `.env.local` con le tue API keys

Copia `.env.example` in `.env.local` e riempi con i tuoi dati:

```bash
cp .env.example .env.local
```

Modifica `.env.local`:

```
VERCEL_URL=https://scheduling-agent-username.vercel.app
DATABASE_URL=postgresql://user:password@ep-xxxx.eu-west-2.neon.tech/dbname?sslmode=require
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
CALENDLY_API_TOKEN=xxxxxxxxxxxxx
CALENDLY_USER_URI=https://api.calendly.com/users/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SESSION_SECRET=your-random-secret-key-min-32-chars
NODE_ENV=development
```

### 4. Inizializza il database

```bash
npm run db:migrate
npm run db:seed
```

### 5. Avvia il server di sviluppo

```bash
npm run dev
```

Il server partirà su `http://localhost:3001`

## 🚀 Deploy su Vercel

### 1. Crea un nuovo progetto GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/serenasarni-1261/scheduling-agent.git
git push -u origin main
```

### 2. Importa in Vercel

1. Vai a https://vercel.com/new
2. Clicca "Import Git Repository"
3. Seleziona il tuo repo
4. Clicca "Import"

### 3. Configura Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

Aggiungi le stesse variabili da `.env.local`:

```
VERCEL_URL=https://scheduling-agent-username.vercel.app
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CALENDLY_API_TOKEN=...
SESSION_SECRET=...
NODE_ENV=production
```

### 4. Deploy

Clicca "Deploy" - Vercel farà tutto automaticamente!

## 📁 Struttura Progetto

```
scheduling-agent/
├── server.js                 # Server principale Express
├── database.sql             # Schema database
├── package.json             # Dipendenze Node.js
├── .env.example             # Template variabili ambiente
├── .gitignore              # File da ignorare in git
├── README.md               # Questo file
├── scripts/
│   ├── migrate.js          # Crea tabelle database
│   └── seed.js             # Inserisce dati demo
├── api/
│   ├── auth.js             # Autenticazione
│   ├── schedule.js         # Gestione fasce orarie
│   ├── appointments.js     # Gestione appuntamenti
│   ├── google.js           # Google Calendar API
│   ├── calendly.js         # Calendly API
│   └── messages.js         # Generazione messaggi
├── frontend/               # React app (da creare)
│   ├── src/
│   ├── public/
│   └── package.json
└── docs/
    └── SETUP_GUIDE.md      # Guida completa setup
```

## 🔑 API Endpoints

### Auth
- `POST /api/users/register` - Registrazione
- `POST /api/users/login` - Login
- `GET /api/users/me` - Profilo utente

### Schedule
- `GET /api/schedule` - Vedi tue fasce orarie
- `POST /api/schedule` - Crea fascia oraria

### Call Types
- `GET /api/call-types` - Vedi tipi di call
- `POST /api/call-types` - Crea tipo di call

### Clienti
- `GET /api/clients` - Lista clienti
- `POST /api/clients` - Aggiungi cliente

### Appuntamenti
- `GET /api/appointments` - Lista appuntamenti
- `POST /api/appointments` - Crea appuntamento
- `PATCH /api/appointments/:id` - Aggiorna appuntamento

### Disponibilità
- `POST /api/availability/generate` - Genera slot liberi

### Messaggi
- `POST /api/messages/generate` - Crea messaggio WhatsApp

### Google Calendar
- `GET /api/google/auth-url` - Ottieni URL autorizzazione
- `POST /api/google/callback` - Callback OAuth
- `POST /api/google/sync` - Sincronizza calendario

### Calendly
- `POST /api/calendly/create-event` - Crea evento Calendly

## 📝 Flusso di Utilizzo

1. **Registrazione/Login** → Crea account
2. **Setup Fascia Oraria** → Configura quando sei disponibile
3. **Setup Call Types** → Definisci durata per tipo di call
4. **Connetti Google Calendar** → Sincronizza automaticamente
5. **Connetti Calendly** → Abilita creazione automatica link
6. **Aggiungi Clienti** → Salva preferenze clienti
7. **Genera Disponibilità** → Visualizza slot liberi
8. **Crea Messaggio WhatsApp** → Condividi orari con cliente
9. **Conferma Appuntamento** → Crea su Google Calendar + Calendly + Google Meet

## 🤖 Funzionalità AI

- **Suggerimenti Intelligenti**: Analizza pattern appuntamenti e suggerisce orari migliori
- **Generazione Messaggi**: Crea automaticamente messaggi WhatsApp personalizzati
- **Sincronizzazione Intelligente**: Evita conflitti di orari
- **Reminder Automatici**: Notifiche push quando cliente non ha confermato

## 🔐 Sicurezza

- ✅ Session-based authentication
- ✅ Password hashing con bcryptjs
- ✅ JWT tokens per API
- ✅ Environment variables per API keys
- ✅ HTTPS su Vercel
- ✅ CORS configurato

## 🐛 Troubleshooting

### Errore: "Cannot find module 'pg'"
```bash
npm install pg
```

### Errore: "Connection refused" dal database
- Verifica `DATABASE_URL` in `.env.local`
- Assicurati che Neon sia online
- Verifica che il tuo IP sia whitelistato

### Errore: "Unauthorized" da Google
- Verifica Client ID e Secret
- Assicurati di aver autorizzato il redirect URI
- Pulisci cache del browser

## 📞 Supporto

Per problemi:
1. Controlla i log della console (`npm run dev`)
2. Verifica le variabili di ambiente
3. Prova con `npm run db:migrate` per reinizializzare il database

## 📄 Licenza

MIT

## 👨‍💻 Autore

Serena Sarni (@serenasarni-1261)

---

**Fatto con ❤️ usando Node.js, Express, PostgreSQL e React**
