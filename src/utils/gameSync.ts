import { GameSession, Player } from '../types';
import { getActiveSession, saveActiveSession } from './storage';

// BroadcastChannel for instant cross-tab sync within the same browser
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('quizarena_multiplayer_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not available', e);
}

export interface SyncMessage {
  type: 'PLAYER_JOINED' | 'GAME_STARTED' | 'SESSION_UPDATE' | 'PLAYER_ANSWER' | 'REQUEST_SESSION';
  pin: string;
  session?: GameSession;
  player?: Player;
  data?: any;
}

// Broadcast an event to all open tabs
export function broadcastSyncMessage(msg: SyncMessage) {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(msg);
    }
  } catch (e) {
    console.warn('Failed to broadcast message', e);
  }

  // Also dispatch window custom event for same-window components
  try {
    window.dispatchEvent(new CustomEvent('quizarena_sync', { detail: msg }));
  } catch {
    // Ignore in non-browser
  }
}

// Subscribe to real-time session updates
export function subscribeToSessionSync(callback: (msg: SyncMessage) => void) {
  const handleBcMessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data) {
      callback(event.data);
    }
  };

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<SyncMessage>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }
  window.addEventListener('quizarena_sync', handleCustomEvent);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('quizarena_sync', handleCustomEvent);
  };
}

// Automatically heal server if another tab asks for a session we have
if (typeof window !== 'undefined') {
  subscribeToSessionSync((msg) => {
    if (msg.type === 'REQUEST_SESSION' && msg.pin) {
      const local = getActiveSession(msg.pin);
      if (local) {
        // Re-push to server so the server has it
        pushLiveSession(local);
        // Reply via broadcast
        broadcastSyncMessage({
          type: 'SESSION_UPDATE',
          pin: msg.pin,
          session: local
        });
      }
    }
  });
}

// Fetch session from Server API with fallback and auto-recovery
export async function fetchLiveSession(pin: string): Promise<GameSession | null> {
  const cleanPin = String(pin || '').trim();
  if (!cleanPin) return null;

  try {
    const res = await fetch(`/api/session/${encodeURIComponent(cleanPin)}`);
    if (res.ok) {
      const serverSession: GameSession = await res.json();
      // Keep localStorage updated
      saveActiveSession(serverSession);
      return serverSession;
    }
  } catch {
    // Network failure, proceed to local check
  }

  // If server didn't have it or returned 404, check local storage
  const local = getActiveSession(cleanPin);
  if (local) {
    // Auto-heal: Server might have restarted; re-push local session to server
    try {
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local)
      }).catch(() => {});
    } catch {}
    return local;
  }

  return null;
}

// Push session to Server API and local storage
export async function pushLiveSession(session: GameSession): Promise<boolean> {
  if (!session || !session.pin) return false;
  const cleanPin = String(session.pin).trim();
  const normalizedSession: GameSession = { ...session, pin: cleanPin };

  // 1. Save to local storage first
  saveActiveSession(normalizedSession);

  // 2. Broadcast to other tabs immediately
  broadcastSyncMessage({
    type: normalizedSession.state === 'question_countdown' || normalizedSession.state === 'question_active' 
      ? 'GAME_STARTED' 
      : 'SESSION_UPDATE',
    pin: cleanPin,
    session: normalizedSession
  });

  // 3. Sync to server API for cross-device support (QR code mobile users)
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedSession)
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not push session to server API', e);
    return false;
  }
}

// Join a live session with check for game-already-started
export async function joinLiveSession(
  pin: string,
  player: Player
): Promise<{ success: boolean; session?: GameSession; error?: string }> {
  const cleanPin = String(pin || '').trim();

  // Helper function to attempt join via API
  const attemptApiJoin = async (): Promise<{ success: boolean; session?: GameSession; error?: string } | null> => {
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(cleanPin)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player })
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          error: data.message || 'Game kuis ini telah selesai (Podium Juara).'
        };
      }

      if (res.ok) {
        const data = await res.json();
        const updatedSession: GameSession = data.session;
        saveActiveSession(updatedSession);
        broadcastSyncMessage({
          type: 'PLAYER_JOINED',
          pin: cleanPin,
          player,
          session: updatedSession
        });
        return { success: true, session: updatedSession };
      }
    } catch {
      // Network error
    }
    return null;
  };

  // 1. First attempt: call Server API
  const firstTry = await attemptApiJoin();
  if (firstTry) return firstTry;

  // 2. Retry after a short delay in case server was processing session creation
  await new Promise(r => setTimeout(r, 150));
  const secondTry = await attemptApiJoin();
  if (secondTry) return secondTry;

  // 3. If server didn't have it or 404, check if local storage has it
  const localSession = getActiveSession(cleanPin);
  if (localSession) {
    // Only reject if podium
    if (localSession.state === 'podium') {
      return {
        success: false,
        error: 'Game kuis ini telah selesai (Podium Juara).'
      };
    }

    // Auto-heal server with local session
    await pushLiveSession(localSession);

    // Try joining again via API
    const thirdTry = await attemptApiJoin();
    if (thirdTry) return thirdTry;

    // Direct local join fallback
    if (!Array.isArray(localSession.players)) {
      localSession.players = [];
    }
    const existingIdx = localSession.players.findIndex(p => p.id === player.id);
    if (existingIdx >= 0) {
      localSession.players[existingIdx] = {
        ...localSession.players[existingIdx],
        ...player
      };
    } else {
      localSession.players.push(player);
    }
    saveActiveSession(localSession);
    broadcastSyncMessage({
      type: 'PLAYER_JOINED',
      pin: cleanPin,
      player,
      session: localSession
    });
    return { success: true, session: localSession };
  }

  // 4. Ask peer tabs via BroadcastChannel if any has this session
  broadcastSyncMessage({
    type: 'REQUEST_SESSION',
    pin: cleanPin
  });

  // Short delay to give peer tab time to respond and re-push to server
  await new Promise(r => setTimeout(r, 300));

  const fourthTry = await attemptApiJoin();
  if (fourthTry) return fourthTry;

  // Check local session again after broadcast
  const recheckedLocal = getActiveSession(cleanPin);
  if (recheckedLocal) {
    if (recheckedLocal.state === 'podium') {
      return {
        success: false,
        error: 'Game kuis ini telah selesai (Podium Juara).'
      };
    }
    return { success: true, session: recheckedLocal };
  }

  return {
    success: false,
    error: `PIN Game ${cleanPin} tidak ditemukan. Pastikan Host sudah membuka Lobby permainan.`
  };
}

// Submit player answer
export async function submitPlayerAnswer(
  pin: string,
  playerId: string,
  questionIndex: number,
  answer: number,
  isCorrect: boolean,
  points: number
): Promise<void> {
  const cleanPin = String(pin || '').trim();

  // Try API
  try {
    await fetch(`/api/session/${encodeURIComponent(cleanPin)}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        questionIndex,
        answer,
        isCorrect,
        points
      })
    });
  } catch (e) {
    console.warn('Could not submit answer to server', e);
  }

  // Also broadcast to tabs
  broadcastSyncMessage({
    type: 'PLAYER_ANSWER',
    pin: cleanPin,
    player: {
      id: playerId,
      name: '',
      avatar: '',
      score: points,
      streak: isCorrect ? 1 : 0,
      answers: {
        [questionIndex]: {
          answer,
          correct: isCorrect,
          timeTaken: 5,
          pointsEarned: points
        }
      }
    }
  });

  // Update local storage
  const session = getActiveSession(cleanPin);
  if (session && Array.isArray(session.players)) {
    const p = session.players.find(pl => pl.id === playerId);
    if (p) {
      p.score = (p.score || 0) + points;
      p.streak = isCorrect ? (p.streak || 0) + 1 : 0;
      p.answers = p.answers || {};
      p.answers[questionIndex] = {
        answer,
        correct: isCorrect,
        timeTaken: 5,
        pointsEarned: points
      };
      saveActiveSession(session);
    }
  }
}
