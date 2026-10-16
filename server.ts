import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // In-memory active game sessions
  const sessions = new Map<string, any>();

  // API Endpoints for real-time game sessions
  app.get('/api/session/:pin', (req, res) => {
    const pin = req.params.pin;
    const session = sessions.get(pin);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Sesi game tidak ditemukan.' });
    }
    return res.json(session);
  });

  // Host initializes or updates full session
  app.post('/api/session', (req, res) => {
    const session = req.body;
    if (!session || !session.pin) {
      return res.status(400).json({ error: 'INVALID_SESSION', message: 'Data sesi tidak valid.' });
    }
    sessions.set(session.pin, session);
    return res.json({ success: true, session });
  });

  // Player joins game lobby
  app.post('/api/session/:pin/join', (req, res) => {
    const pin = req.params.pin;
    const session = sessions.get(pin);
    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Sesi game dengan PIN tersebut tidak ditemukan.'
      });
    }

    // CRITICAL: When host starts the game (state !== 'lobby'), NO NEW PLAYERS CAN JOIN!
    if (session.state !== 'lobby') {
      return res.status(403).json({
        error: 'GAME_ALREADY_STARTED',
        message: 'Game live sudah dimulai! Pemain baru sudah tidak dapat bergabung lagi.'
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
      session.players[existingIndex] = player;
    } else {
      session.players.push(player);
    }

    sessions.set(pin, session);
    return res.json({ success: true, session, player });
  });

  // State update (e.g. host starts game, next question, podium)
  app.post('/api/session/:pin/state', (req, res) => {
    const pin = req.params.pin;
    const session = sessions.get(pin);
    if (!session) {
      return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
    }
    const { state, currentQuestionIndex, timeRemaining } = req.body;
    if (state !== undefined) session.state = state;
    if (currentQuestionIndex !== undefined) session.currentQuestionIndex = currentQuestionIndex;
    if (timeRemaining !== undefined) session.timeRemaining = timeRemaining;
    sessions.set(pin, session);
    return res.json({ success: true, session });
  });

  // Player answer submission
  app.post('/api/session/:pin/answer', (req, res) => {
    const pin = req.params.pin;
    const session = sessions.get(pin);
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
    sessions.set(pin, session);
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
