import React, { useState, useEffect } from 'react';
import { GameSession, Player, Language } from '../types';
import { fetchLiveSession, joinLiveSession, subscribeToSessionSync } from '../utils/gameSync';
import { translations } from '../utils/i18n';
import { Play, User, AlertTriangle, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface PlayerJoinProps {
  initialPin?: string;
  onJoined: (session: GameSession, player: Player) => void;
  lang: Language;
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({
  initialPin = '',
  onJoined,
  lang
}) => {
  const t = translations[lang];
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [sessionLobbyFound, setSessionLobbyFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [availableSessions, setAvailableSessions] = useState<{ pin: string; title: string; state: string }[]>([]);

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }

    // Check for active open sessions on the server to help players discover open lobbies
    fetch('/api/sessions/active')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.sessions)) {
          setAvailableSessions(data.sessions);
        }
      })
      .catch(() => {});
  }, [initialPin]);

  // Real-time check on PIN status (detect if game is in lobby or already started)
  useEffect(() => {
    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 6) {
      setIsGameStarted(false);
      setSessionLobbyFound(false);
      setError('');
      return;
    }

    let isMounted = true;

    const checkPinStatus = async () => {
      setIsCheckingSession(true);
      const session = await fetchLiveSession(trimmedPin);
      if (!isMounted) return;
      setIsCheckingSession(false);

      if (session) {
        if (session.state !== 'lobby') {
          setIsGameStarted(true);
          setSessionLobbyFound(false);
          setError(lang === 'id' 
            ? 'Game live sudah dimulai oleh Host! Pemain baru sudah tidak dapat bergabung lagi.' 
            : 'The live game has already started! New players can no longer join.');
        } else {
          setIsGameStarted(false);
          setSessionLobbyFound(true);
          setError('');
        }
      } else {
        setSessionLobbyFound(false);
        setIsGameStarted(false);
      }
    };

    checkPinStatus();

    // Subscribe to real-time events in case host starts while user is typing
    const unsubscribe = subscribeToSessionSync((msg) => {
      if (msg.pin === trimmedPin) {
        if (msg.type === 'GAME_STARTED' || (msg.session && msg.session.state !== 'lobby')) {
          if (isMounted) {
            setIsGameStarted(true);
            setSessionLobbyFound(false);
            setError(lang === 'id' 
              ? 'Game live sudah dimulai oleh Host! Pemain baru sudah tidak dapat bergabung lagi.' 
              : 'The live game has already started! New players can no longer join.');
          }
        } else if (msg.type === 'SESSION_UPDATE' && msg.session?.state === 'lobby') {
          if (isMounted) {
            setIsGameStarted(false);
            setSessionLobbyFound(true);
            setError('');
          }
        }
      }
    });

    // Short poll every 800ms to stay updated
    const interval = setInterval(checkPinStatus, 800);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [pin, lang]);

  const avatars = ['🦊', '🐼', '🦄', '🦁', '🐯', '🐰', '🐸', '🤖', '🚀', '⭐', '🐱', '🐶'];

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length !== 6) {
      setError(lang === 'id' ? 'Harap masukkan PIN Game 6 digit yang valid.' : 'Please enter a valid 6-digit Game PIN.');
      soundManager.playWrong();
      return;
    }
    if (!name.trim()) {
      setError(lang === 'id' ? 'Harap masukkan nama panggilan Anda.' : 'Please enter your nickname.');
      soundManager.playWrong();
      return;
    }

    if (isGameStarted) {
      setError(lang === 'id' 
        ? 'Game live sudah dimulai oleh Host! Pemain baru sudah tidak dapat bergabung lagi.' 
        : 'The live game has already started! New players can no longer join.');
      soundManager.playWrong();
      return;
    }

    setIsSubmitting(true);

    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      avatar,
      score: 0,
      streak: 0,
      answers: {}
    };

    const result = await joinLiveSession(cleanPin, newPlayer);
    setIsSubmitting(false);

    if (!result.success || !result.session) {
      soundManager.playWrong();
      setError(result.error || (lang === 'id' 
        ? 'Gagal bergabung. Pastikan PIN benar dan Host masih berada di Lobby.' 
        : 'Failed to join. Make sure PIN is correct and Host is still in the lobby.'));
      if (result.error && result.error.includes('sudah dimulai')) {
        setIsGameStarted(true);
      }
      return;
    }

    // Success!
    soundManager.playCorrect();
    onJoined(result.session, newPlayer);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-400/30">
            <Play className="w-8 h-8 text-blue-950 fill-blue-950 ml-1" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t.joinLiveQuiz}</h2>
          <p className="text-xs text-blue-200 mt-1">{t.enterPinAvatar}</p>
        </div>

        {/* Live Lobby Status Indicator */}
        {pin.trim().length === 6 && (
          <div className="mb-4">
            {isCheckingSession ? (
              <div className="flex items-center justify-center space-x-2 text-blue-300 text-xs py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                <span>{lang === 'id' ? 'Memeriksa status game...' : 'Checking game status...'}</span>
              </div>
            ) : isGameStarted ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/25 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-start space-x-2.5 shadow-md">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-rose-300 uppercase tracking-wide">
                    {lang === 'id' ? 'Game Sudah Dimulai' : 'Game In Progress'}
                  </div>
                  <div className="text-rose-200 text-[11px] mt-0.5 leading-relaxed">
                    {lang === 'id' 
                      ? 'Host telah memulai permainan live. Pemain baru sudah tidak dapat bergabung lagi ke dalam sesi ini.' 
                      : 'The host has already started this live game. New players can no longer join this session.'}
                  </div>
                </div>
              </div>
            ) : sessionLobbyFound ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'id' ? 'Lobby Terbuka • Siap bergabung' : 'Lobby Open • Ready to join'}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Available Open Lobbies on this Server */}
        {availableSessions.length > 0 && pin.length !== 6 && (
          <div className="mb-4 p-3.5 bg-blue-950/80 border border-blue-700/80 rounded-2xl shadow-inner">
            <div className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{lang === 'id' ? 'Lobby Game Tersedia Saat Ini:' : 'Available Open Lobbies:'}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">ONLINE</span>
            </div>
            <div className="space-y-1.5">
              {availableSessions.slice(0, 3).map(s => (
                <button
                  key={s.pin}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setPin(s.pin);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-blue-900 hover:bg-blue-800 border border-blue-700/60 flex items-center justify-between transition-all group"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono font-black text-yellow-400 mr-2 text-sm">{s.pin}</span>
                    <span className="text-white text-xs font-semibold">{s.title}</span>
                  </div>
                  <span className="text-[11px] bg-yellow-400/20 text-yellow-300 group-hover:bg-yellow-400 group-hover:text-blue-950 px-2 py-1 rounded-lg font-bold transition-all shrink-0">
                    {lang === 'id' ? 'Gunakan PIN' : 'Use PIN'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && !isGameStarted && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold shadow-md">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{error}</div>
                <div className="mt-2 text-[11px] text-rose-300">
                  {lang === 'id' 
                    ? 'Tips: Pastikan Host masih berada di layar Lobby kuis dan 6 digit PIN sesuai dengan yang ada di layar Host.' 
                    : 'Tip: Make sure the Host is on the Lobby screen and the 6-digit PIN matches.'}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
              {t.gamePin} *
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 849201"
              value={pin}
              disabled={isSubmitting}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-yellow-400 placeholder-blue-500 focus:outline-none focus:border-yellow-400 shadow-inner disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
              {t.yourNickname}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="text"
                maxLength={15}
                placeholder={t.nicknamePlaceholder}
                value={name}
                disabled={isSubmitting || isGameStarted}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 text-sm disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
              {t.chooseAvatar}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  disabled={isSubmitting || isGameStarted}
                  onClick={() => { soundManager.playClick(); setAvatar(av); }}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all disabled:opacity-50 ${
                    avatar === av 
                      ? 'bg-yellow-400 text-blue-950 font-bold scale-105 shadow-lg shadow-yellow-400/30' 
                      : 'bg-blue-950 hover:bg-blue-800 border border-blue-700 text-white'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGameStarted}
            className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl flex items-center justify-center space-x-2 transition-all transform ${
              isGameStarted
                ? 'bg-rose-900/60 border border-rose-700 text-rose-300 cursor-not-allowed opacity-80'
                : 'bg-yellow-400 hover:bg-yellow-300 text-blue-950 shadow-yellow-400/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-950" />
                <span>{lang === 'id' ? 'Menghubungkan...' : 'Connecting...'}</span>
              </>
            ) : isGameStarted ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-300" />
                <span>{t.lobbyClosedBtn}</span>
              </>
            ) : (
              <span>{t.enterLobbyBtn}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
