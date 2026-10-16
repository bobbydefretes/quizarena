import React, { useEffect, useState, useRef } from 'react';
import { Quiz, GameSession, Player, Language } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Users, Play, ArrowLeft, Copy, Check, Sparkles, Share2, Radio } from 'lucide-react';
import { pushLiveSession, fetchLiveSession, subscribeToSessionSync, joinLiveSession } from '../utils/gameSync';
import { soundManager } from '../utils/sound';
import { translations } from '../utils/i18n';
import { ShareQuizModal } from './ShareQuizModal';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const prevPlayerCountRef = useRef<number>(0);

  const [networkIps, setNetworkIps] = useState<string[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [activeUrlType, setActiveUrlType] = useState<'origin' | 'lan'>('origin');
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);

  // Keep a reference to current session for auto-healing and heartbeats
  const sessionRef = useRef<GameSession>({
    pin,
    quizId: quiz.id,
    quiz,
    hostId: 'host-1',
    state: 'lobby',
    currentQuestionIndex: 0,
    timeRemaining: quiz.questions[0]?.timeLimit || 15,
    players: [],
    isActive: true
  });

  // Fetch local LAN IPs for cross-PC & mobile Wi-Fi play
  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.localIps) && data.localIps.length > 0) {
          setNetworkIps(data.localIps);
          setSelectedIp(data.localIps[0]);
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setActiveUrlType('lan');
          }
        }
      })
      .catch(() => {});
  }, []);

  // Initialize session in server & storage, and sync players in real-time
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
    sessionRef.current = session;

    // Push initial session so API & local storage have it
    pushLiveSession(session);

    const updatePlayersList = (newPlayers: Player[]) => {
      if (newPlayers && newPlayers.length > prevPlayerCountRef.current) {
        soundManager.playCorrect();
      }
      prevPlayerCountRef.current = newPlayers?.length || 0;
      setPlayers(newPlayers || []);
      sessionRef.current.players = newPlayers || [];
    };

    // 1. Listen for instant BroadcastChannel events (same browser tabs/windows)
    const unsubscribeSync = subscribeToSessionSync((msg) => {
      if (msg.pin === pin) {
        if (msg.type === 'PLAYER_JOINED' || msg.type === 'SESSION_UPDATE') {
          if (msg.session && Array.isArray(msg.session.players)) {
            updatePlayersList(msg.session.players);
          }
        } else if (msg.type === 'REQUEST_SESSION') {
          // A client tab is requesting this PIN: immediately re-push to server!
          pushLiveSession(sessionRef.current);
        }
      }
    });

    // 2. Poll server & local storage every 500ms; auto-heal if server lost the session
    const interval = setInterval(async () => {
      const current = await fetchLiveSession(pin);
      if (current && Array.isArray(current.players)) {
        updatePlayersList(current.players);
      } else {
        // Server doesn't have it or returned 404: re-push!
        pushLiveSession(sessionRef.current);
      }
    }, 500);

    // 3. Storage event listener as extra safety
    const handleStorage = async (e: StorageEvent) => {
      if (e.key && e.key.includes(pin)) {
        const current = await fetchLiveSession(pin);
        if (current && Array.isArray(current.players)) {
          updatePlayersList(current.players);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      unsubscribeSync();
      window.removeEventListener('storage', handleStorage);
    };
  }, [pin, quiz]);

  // Client share link with client=true parameter
  const originJoinUrl = `${window.location.origin}/?pin=${pin}&client=true`;
  const lanJoinUrl = selectedIp ? `http://${selectedIp}:3000/?pin=${pin}&client=true` : originJoinUrl;
  const currentActiveUrl = activeUrlType === 'lan' && selectedIp ? lanJoinUrl : originJoinUrl;

  const copyPinOrLink = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(currentActiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
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

    // Save and broadcast that game has started
    await pushLiveSession(session);
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

        <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 rounded-xl text-emerald-300 text-xs font-bold">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{lang === 'id' ? 'Lobby Terbuka (Menerima Pemain)' : 'Lobby Open (Accepting Players)'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / Top: Join Info & QR Code */}
        <div className="lg:col-span-1 bg-blue-900 border border-blue-700/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none"></div>

          <h3 className="text-yellow-300 text-xs font-black uppercase tracking-wider mb-2">{t.joinAt}</h3>
          
          {/* LAN vs Origin Toggle if local IP is detected */}
          {networkIps.length > 0 && (
            <div className="flex bg-blue-950 p-1 rounded-xl mb-4 text-xs font-bold border border-blue-800 w-full">
              <button
                onClick={() => setActiveUrlType('origin')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeUrlType === 'origin' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-300 hover:text-white'}`}
              >
                PC Ini / Tab
              </button>
              <button
                onClick={() => setActiveUrlType('lan')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeUrlType === 'lan' ? 'bg-yellow-400 text-blue-950 shadow' : 'text-blue-300 hover:text-white'}`}
              >
                Beda PC & HP (Wi-Fi)
              </button>
            </div>
          )}

          <p className="text-xs text-blue-200 mb-4">{t.scanQr}</p>

          <div className="bg-white p-4 rounded-2xl shadow-xl mb-4 inline-block">
            <QRCodeSVG value={currentActiveUrl} size={170} level="H" includeMargin={true} />
          </div>

          <div className="w-full bg-blue-950 border border-blue-700 rounded-2xl p-4 mb-4">
            <span className="block text-xs text-blue-300 uppercase tracking-widest mb-1 font-semibold">{t.gamePin}</span>
            <div className="text-4xl font-black text-yellow-400 tracking-widest font-mono">
              {pin}
            </div>
          </div>

          <div className="w-full space-y-2">
            <button
              onClick={copyPinOrLink}
              className="w-full py-2.5 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-100 hover:text-white text-xs font-bold flex items-center justify-center space-x-2 border border-blue-700 transition-all shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-yellow-400" />}
              <span>{copied ? t.linkCopied : (activeUrlType === 'lan' ? 'Salin Link Wi-Fi (Beda PC/HP)' : 'Salin Link Client')}</span>
            </button>

            <a
              href={originJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundManager.playClick()}
              className="w-full py-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-yellow-300 hover:text-yellow-200 text-xs font-bold flex items-center justify-center space-x-2 border border-blue-600 transition-all shadow-sm"
              title="Buka layar pemain di tab baru untuk mencoba kuis secara langsung"
            >
              <span>🎮</span>
              <span>{lang === 'id' ? 'Buka Tab Client (Uji Coba)' : 'Open Client Tab (Test Play)'}</span>
            </a>

            <button
              onClick={async () => {
                soundManager.playClick();
                const botNames = ['Budi', 'Siti', 'Rian', 'Dewi', 'Andi', 'Putri', 'Kevin', 'Maya'];
                const botAvatars = ['🦊', '🐼', '🦄', '🦁', '🐯', '🐰', '🐸', '🤖'];
                const botName = botNames[Math.floor(Math.random() * botNames.length)];
                const botAvatar = botAvatars[Math.floor(Math.random() * botAvatars.length)];
                const botPlayer: Player = {
                  id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  name: `${botName}`,
                  avatar: botAvatar,
                  score: 0,
                  streak: 0,
                  answers: {}
                };
                await pushLiveSession(sessionRef.current);
                await joinLiveSession(pin, botPlayer);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center space-x-2 border border-emerald-500/60 transition-all shadow-sm"
              title="Tambahkan pemain uji coba langsung ke lobby ini untuk simulasi"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{lang === 'id' ? '+ Tambah Pemain Uji Coba' : '+ Add Test Player'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setShowShareModal(true);
              }}
              className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black flex items-center justify-center space-x-2 shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Share2 className="w-4 h-4 text-blue-950" />
              <span>{lang === 'id' ? 'Bagikan ke WhatsApp / Medsos' : 'Share to WhatsApp / Social'}</span>
            </button>

            {/* Network Guide Accordion Button */}
            <button
              type="button"
              onClick={() => setShowNetworkGuide(!showNetworkGuide)}
              className="w-full py-2 text-[11px] text-blue-300 hover:text-yellow-300 underline font-medium text-center"
            >
              {showNetworkGuide ? 'Sembunyikan Panduan Beda Browser & Beda PC' : '❓ Panduan Main Beda Browser & Beda PC / HP'}
            </button>

            {showNetworkGuide && (
              <div className="text-left bg-blue-950/90 border border-blue-700 p-3 rounded-xl text-[11px] text-blue-200 space-y-2 mt-2 shadow-inner">
                <div className="font-bold text-yellow-300">📱 Beda Browser di PC yang sama:</div>
                <p>Buka Chrome, Edge, Firefox, atau Incognito. Buka link atau masukkan PIN {pin} di menu Player.</p>
                <div className="font-bold text-yellow-300">💻 Beda PC / Laptop / HP (Wi-Fi):</div>
                <p>Pastikan HP/PC terhubung ke Wi-Fi yang sama dengan Host. Buka link Wi-Fi Host di atas atau scan QR Code.</p>
              </div>
            )}
          </div>
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
                <span className="font-mono text-yellow-300">{players.length}</span>
                <span>{t.playersJoined}</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  <span>{lang === 'id' ? 'Pemain Terhubung di Lobby (Real-Time):' : 'Connected Players in Lobby (Real-Time):'}</span>
                </h4>
                {players.length > 0 && (
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/40">
                    Live Sync • {players.length} online
                  </span>
                )}
              </div>

              {players.length === 0 ? (
                <div className="text-center py-16 bg-blue-950/60 rounded-2xl border border-blue-800">
                  <div className="w-12 h-12 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <QrCode className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">{t.waitingPlayers}</h4>
                  <p className="text-blue-300 text-xs max-w-md mx-auto">
                    {lang === 'id' 
                      ? 'Pemain yang membuka link atau scan QR code akan otomatis muncul di sini secara langsung (real-time)!' 
                      : 'Players who open the link or scan the QR code will appear here automatically in real-time!'}
                  </p>
                  <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-blue-900/80 border border-blue-700 text-yellow-300 text-xs font-mono">
                    PIN: {pin}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-blue-950 border border-yellow-400/60 rounded-xl p-3 flex items-center space-x-3 shadow-lg hover:border-yellow-300 transition-all transform hover:scale-[1.02]"
                    >
                      <span className="text-2xl p-1 bg-blue-900 rounded-lg">{p.avatar}</span>
                      <div className="truncate flex-1">
                        <div className="text-white font-bold text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                          <span>Ready</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-blue-300">
              {players.length === 0 
                ? (lang === 'id' ? 'Menunggu pemain bergabung sebelum mulai...' : 'Waiting for players to join before starting...') 
                : `${players.length} ${t.playersReady}`}
            </div>

            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-xl shadow-yellow-400/30 flex items-center justify-center space-x-2 transition-transform transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play className="w-4 h-4 fill-blue-950" />
              <span>{t.startLiveGame}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal with PIN */}
      {showShareModal && (
        <ShareQuizModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          quiz={quiz}
          gamePin={pin}
          lang={lang}
        />
      )}
    </div>
  );
};
