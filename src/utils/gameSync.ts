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
  type: 'PLAYER_JOINED' | 'GAME_STARTED' | 'SESSION_UPDATE' | 'PLAYER_ANSWER';
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

// Fetch session from Server API with fallback to local storage
export async function fetchLiveSession(pin: string): Promise<GameSession | null> {
  try {
    const res = await fetch(`/api/session/${encodeURIComponent(pin)}`);
    if (res.ok) {
      const serverSession: GameSession = await res.json();
      // Keep localStorage in sync
      saveActiveSession(serverSession);
      return serverSession;
    }
  } catch {
    // Server fetch failed, fallback to local storage
  }

  return getActiveSession(pin);
}

// Push session to Server API and local storage
export async function pushLiveSession(session: GameSession): Promise<void> {
  // 1. Save to local storage first
  saveActiveSession(session);

  // 2. Broadcast to other tabs
  broadcastSyncMessage({
    type: session.state === 'question_countdown' || session.state === 'question_active' ? 'GAME_STARTED' : 'SESSION_UPDATE',
    pin: session.pin,
    session
  });

  // 3. Sync to server API for cross-device support (QR code mobile users)
  try {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  } catch (e) {
    console.warn('Could not push session to server API', e);
  }
}

// Join a live session with check for game-already-started
export async function joinLiveSession(
  pin: string,
  player: Player
): Promise<{ success: boolean; session?: GameSession; error?: string }> {
  // 1. Try server API first
  try {
    const res = await fetch(`/api/session/${encodeURIComponent(pin)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player })
    });

    if (res.status === 403) {
      const data = await res.json();
      return {
        success: false,
        error: data.message || 'Game live sudah dimulai! Pemain baru sudah tidak dapat bergabung lagi.'
      };
    }

    if (res.ok) {
      const data = await res.json();
      const updatedSession: GameSession = data.session;
      saveActiveSession(updatedSession);
      broadcastSyncMessage({
        type: 'PLAYER_JOINED',
        pin,
        player,
        session: updatedSession
      });
      return { success: true, session: updatedSession };
    }
  } catch {
    // API request failed, continue to local fallback
  }

  // 2. Local Fallback (in case offline or direct local session)
  const localSession = getActiveSession(pin);
  if (!localSession) {
    return {
      success: false,
      error: 'PIN Game tidak ditemukan. Pastikan Host sudah membuka Lobby permainan.'
    };
  }

  // Check if Host has already started the game!
  if (localSession.state !== 'lobby') {
    return {
      success: false,
      error: 'Game live sudah dimulai! Pemain baru sudah tidak dapat bergabung lagi.'
    };
  }

  // Add player to local session
  const existingPlayers = localSession.players || [];
  const existingIdx = existingPlayers.findIndex(p => p.id === player.id);
  let updatedPlayers: Player[];
  if (existingIdx >= 0) {
    updatedPlayers = [...existingPlayers];
    updatedPlayers[existingIdx] = player;
  } else {
    updatedPlayers = [...existingPlayers, player];
  }

  const updatedSession: GameSession = {
    ...localSession,
    players: updatedPlayers
  };

  saveActiveSession(updatedSession);
  broadcastSyncMessage({
    type: 'PLAYER_JOINED',
    pin,
    player,
    session: updatedSession
  });

  return { success: true, session: updatedSession };
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
  try {
    await fetch(`/api/session/${encodeURIComponent(pin)}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, questionIndex, answer, isCorrect, points })
    });
  } catch {
    // Ignore server error
  }

  broadcastSyncMessage({
    type: 'PLAYER_ANSWER',
    pin,
    data: { playerId, questionIndex, answer, isCorrect, points }
  });
}
