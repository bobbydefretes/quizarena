import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Persistence file path
const DATA_DIR = path.resolve(__dirname, '.data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data dir', err);
  }
}

function loadPersistedSessions(): Map<string, any> {
  const map = new Map<string, any>();
  try {
    ensureDataDir();
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data === 'object' && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          map.set(String(key).trim(), val);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted sessions, starting empty', err);
  }
  return map;
}

function savePersistedSessions(sessions: Map<string, any>) {
  try {
    ensureDataDir();
    const obj: Record<string, any> = {};
    for (const [key, val] of sessions.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save sessions to file', err);
  }
}

async function startServer() {
  const app = express();
  
  // Allow cross-origin requests from preview / dev hostnames
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Load persistent sessions on boot
  const sessions = loadPersistedSessions();
  console.log(`Loaded ${sessions.size} persisted sessions from disk.`);

  // Helper to get session from memory or disk
  function getSession(pin: string): any | null {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return null;
    let s = sessions.get(cleanPin);
    if (!s) {
      const diskSessions = loadPersistedSessions();
      s = diskSessions.get(cleanPin);
      if (s) {
        sessions.set(cleanPin, s);
      }
    }
    return s || null;
  }

  // List all active sessions
  app.get('/api/sessions/active', (_req, res) => {
    // Merge disk sessions in case of external updates
    const disk = loadPersistedSessions();
    for (const [k, v] of disk.entries()) {
      if (!sessions.has(k)) {
        sessions.set(k, v);
      }
    }

    const list: any[] = [];
    for (const [pin, s] of sessions.entries()) {
      list.push({
        pin,
        title: s.quiz?.title || 'Unknown Quiz',
        state: s.state,
        playerCount: Array.isArray(s.players) ? s.players.length : 0,
        createdAt: s.createdAt || s.lastUpdated || Date.now()
      });
    }
    return res.json({ sessions: list });
  });

  // Get single session by PIN
  app.get('/api/session/:pin', (req, res) => {
    const pin = String(req.params.pin || '').trim();
    const session = getSession(pin);
    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: `PIN Game ${pin} tidak ditemukan. Pastikan Host sudah membuka Lobby permainan.`
      });
    }
    return res.json(session);
  });

  // Host initializes, heartbeats, or updates session
  app.post('/api/session', (req, res) => {
    const session = req.body;
    if (!session || !session.pin) {
      return res.status(400).json({ error: 'INVALID_SESSION', message: 'Data sesi tidak valid.' });
    }
    const pin = String(session.pin).trim();
    session.pin = pin;
    session.lastUpdated = Date.now();
    
    // If session already exists, merge players if new session has fewer players
    const existing = getSession(pin);
    if (existing && Array.isArray(existing.players) && (!Array.isArray(session.players) || session.players.length < existing.players.length)) {
      session.players = existing.players;
    }

    sessions.set(pin, session);
    savePersistedSessions(sessions);
    console.log(`[SERVER] Saved/Updated session PIN: ${pin}, state: ${session.state}, players: ${(session.players || []).length}`);
    return res.json({ success: true, session });
  });

  // Host heartbeat
  app.post('/api/session/:pin/heartbeat', (req, res) => {
    const pin = String(req.params.pin || '').trim();
    const session = getSession(pin);
    if (session) {
      session.lastHeartbeat = Date.now();
      sessions.set(pin, session);
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
  });

  // Network info endpoint so Host can display Wi-Fi LAN IP for other PCs & phones
  app.get('/api/network-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }

    const hostHeader = req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const currentOrigin = `${proto}://${hostHeader}`;

    return res.json({
      origin: currentOrigin,
      localIps: ips,
      port: 3000
    });
  });

  // Player joins game lobby or active game
  app.post('/api/session/:pin/join', (req, res) => {
    const pin = String(req.params.pin || '').trim();
    const session = getSession(pin);
    if (!session) {
      console.warn(`[SERVER] Join rejected: PIN ${pin} not found`);
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: `PIN Game ${pin} tidak ditemukan. Pastikan Host sudah membuka Lobby permainan.`
      });
    }

    // Only reject if game is completely finished (podium)
    if (session.state === 'podium') {
      return res.status(403).json({
        error: 'GAME_FINISHED',
        message: 'Game kuis ini telah selesai (Podium Juara). Silakan tunggu sesi game berikutnya dari Host!'
      });
    }

    const player = req.body.player;
    if (!player || !player.id || !player.name) {
      return res.status(400).json({ error: 'INVALID_PLAYER', message: 'Data pemain tidak lengkap.' });
    }

    if (!Array.isArray(session.players)) {
      session.players = [];
    }

    const existingIndex = session.players.findIndex((p: any) => p.id === player.id);
    if (existingIndex >= 0) {
      session.players[existingIndex] = {
        ...session.players[existingIndex],
        ...player
      };
    } else {
      session.players.push(player);
    }

    session.lastUpdated = Date.now();
    sessions.set(pin, session);
    savePersistedSessions(sessions);
    console.log(`[SERVER] Player ${player.name} (${player.avatar}) joined session ${pin} (state: ${session.state}). Total: ${session.players.length}`);
    return res.json({ success: true, session, player });
  });

  // State update (e.g. host starts game, next question, podium)
  app.post('/api/session/:pin/state', (req, res) => {
    const pin = String(req.params.pin || '').trim();
    const session = getSession(pin);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    const { state, currentQuestionIndex, timeRemaining } = req.body;
    if (state !== undefined) session.state = state;
    if (currentQuestionIndex !== undefined) session.currentQuestionIndex = currentQuestionIndex;
    if (timeRemaining !== undefined) session.timeRemaining = timeRemaining;
    session.lastUpdated = Date.now();
    sessions.set(pin, session);
    savePersistedSessions(sessions);
    return res.json({ success: true, session });
  });

  // Player answer submission
  app.post('/api/session/:pin/answer', (req, res) => {
    const pin = String(req.params.pin || '').trim();
    const session = getSession(pin);
    if (!session) return res.status(404).json({ error: 'SESSION_NOT_FOUND' });

    const { playerId, questionIndex, answer, isCorrect, points } = req.body;
    const p = (session.players || []).find((pl: any) => pl.id === playerId);
    if (p) {
      p.score = (p.score || 0) + (points || 0);
      p.streak = isCorrect ? (p.streak || 0) + 1 : 0;
      p.answers = p.answers || {};
      p.answers[questionIndex] = {
        answer,
        correct: isCorrect,
        timeTaken: 5,
        pointsEarned: points
      };
    }
    session.lastUpdated = Date.now();
    sessions.set(pin, session);
    savePersistedSessions(sessions);
    return res.json({ success: true, session });
  });

  // Mount Vite or serve static assets
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizArena Server running on port ${PORT}`);
  });
}

startServer();
