import React, { useEffect, useState, useRef } from 'react';
import { Quiz, GameSession, Player, Language } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Users, Play, ArrowLeft, Copy, Check, Sparkles } from 'lucide-react';
import { saveActiveSession, getActiveSession } from '../utils/storage';
import { soundManager } from '../utils/sound';
import { translations } from '../utils/i18n';

interface HostLobbyProps {
  quiz: Quiz;
  onStartGame: (session: GameSession) => void;
  onBack: () => void;
  lang: Language;
}

export const HostLobby: React.FC<HostLobbyProps> = ({
  quiz,
  onStartGame,
  onBack,
  lang
}) => {
  const t = translations[lang];
  const [pin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const prevPlayerCountRef = useRef<number>(0);

  // Initialize session in local storage and sync players instantly
  useEffect(() => {
    const session: GameSession = {
      pin,
      quizId: quiz.id,
      quiz,
      hostId: 'host-1',
      state: 'lobby',
      currentQuestionIndex: 0,
      timeRemaining: quiz.questions[0]?.timeLimit || 15,
      players: [],
      isActive: true
    };
    saveActiveSession(session);

    const checkPlayers = () => {
      const current = getActiveSession(pin);
      if (current && current.players) {
        if (current.players.length > prevPlayerCountRef.current) {
          soundManager.playCorrect();
        }
        prevPlayerCountRef.current = current.players.length;
        setPlayers(current.players);
      }
    };

    const interval = setInterval(checkPlayers, 300);

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes(pin)) {
        checkPlayers();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [pin, quiz]);

  // Client share link with client=true parameter
  const joinUrl = `${window.location.origin}/?pin=${pin}&client=true`;

  const copyPinOrLink = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    soundManager.playVictory();
    const session: GameSession = {
      pin,
      quizId: quiz.id,
      quiz,
      hostId: 'host-1',
      state: 'question_countdown',
      currentQuestionIndex: 0,
      timeRemaining: 3,
      players,
      isActive: true
    };
    saveActiveSession(session);
    onStartGame(session);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { soundManager.playClick(); onBack(); }}
          className="flex items-center space-x-2 text-blue-200 hover:text-white transition-colors text-sm font-semibold bg-blue-900 px-4 py-2 rounded-xl border border-blue-700 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.exitLobby}</span>
        </button>

        <div className="flex items-center space-x-2 bg-yellow-400/20 border border-yellow-400/40 px-4 py-2 rounded-xl text-yellow-300 text-xs font-bold">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Live Host Session</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / Top: Join Info & QR Code */}
        <div className="lg:col-span-1 bg-blue-900 border border-blue-700/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none"></div>

          <h3 className="text-yellow-300 text-xs font-black uppercase tracking-wider mb-2">{t.joinAt}</h3>
          <p className="text-xs text-blue-200 mb-6">{t.scanQr}</p>

          <div className="bg-white p-4 rounded-2xl shadow-xl mb-6 inline-block">
            <QRCodeSVG value={joinUrl} size={180} level="H" includeMargin={true} />
          </div>

          <div className="w-full bg-blue-950 border border-blue-700 rounded-2xl p-4 mb-4">
            <span className="block text-xs text-blue-300 uppercase tracking-widest mb-1 font-semibold">{t.gamePin}</span>
            <div className="text-4xl font-black text-yellow-400 tracking-widest font-mono">
              {pin}
            </div>
          </div>

          <button
            onClick={copyPinOrLink}
            className="w-full py-2.5 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-100 hover:text-white text-xs font-bold flex items-center justify-center space-x-2 border border-blue-700 transition-all shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-yellow-400" />}
            <span>{copied ? t.linkCopied : (lang === 'id' ? 'Salin Link Client Game' : 'Copy Client Game Link')}</span>
          </button>
        </div>

        {/* Right: Players Lobby & Start Game */}
        <div className="lg:col-span-2 bg-blue-900 border border-blue-700/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-800">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{quiz.title}</h2>
                <p className="text-xs text-blue-200 mt-1">{quiz.questions.length} {t.questionsCount} • {quiz.category}</p>
              </div>
              <div className="flex items-center space-x-2 bg-blue-950 px-4 py-2 rounded-xl text-white text-sm font-bold border border-blue-700">
                <Users className="w-4 h-4 text-yellow-400" />
                <span>{players.length} {t.playersJoined}</span>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-4">
                {lang === 'id' ? 'Pemain Terhubung di Lobby (Real-Time):' : 'Connected Players in Lobby (Real-Time):'}
              </h4>
              {players.length === 0 ? (
                <div className="text-center py-16 bg-blue-950/60 rounded-2xl border border-blue-800">
                  <div className="w-12 h-12 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <QrCode className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">{t.waitingPlayers}</h4>
                  <p className="text-blue-300 text-xs">
                    {lang === 'id' ? 'Pemain yang membuka share link atau scan QR akan langsung muncul di sini secara otomatis!' : 'Players joining via share link or QR will appear here instantly!'} PIN: <span className="text-yellow-400 font-mono font-bold">{pin}</span>
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-blue-950 border border-yellow-400/50 rounded-xl p-3 flex items-center space-x-3 shadow-lg animate-bounce-short"
                    >
                      <span className="text-2xl">{p.avatar}</span>
                      <div className="truncate">
                        <div className="text-white font-bold text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-emerald-400 font-bold">Ready</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-blue-800 flex items-center justify-between">
            <div className="text-xs text-blue-300">
              {players.length === 0 
                ? (lang === 'id' ? 'Menunggu pemain bergabung...' : 'Waiting for players to join...') 
                : `${players.length} ${t.playersReady}`}
            </div>

            <button
              onClick={handleStart}
              className="px-8 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-xl shadow-yellow-400/30 flex items-center space-x-2 transition-transform transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-blue-950" />
              <span>{t.startLiveGame}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
