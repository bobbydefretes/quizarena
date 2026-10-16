import React, { useEffect, useState, useRef } from 'react';
import { GameSession, Player, Language } from '../types';
import { fetchLiveSession, pushLiveSession, subscribeToSessionSync, submitPlayerAnswer } from '../utils/gameSync';
import { translations } from '../utils/i18n';
import { Trophy, CheckCircle2, XCircle, Flame, Clock, Share2, Hourglass, Users, Radio, LogOut, Sparkles, Check, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import { ShareQuizModal } from './ShareQuizModal';

interface PlayerGameScreenProps {
  initialSession: GameSession;
  currentPlayer: Player;
  onLeave: () => void;
  lang: Language;
}

export const PlayerGameScreen: React.FC<PlayerGameScreenProps> = ({
  initialSession,
  currentPlayer,
  onLeave,
  lang
}) => {
  const t = translations[lang];
  const [session, setSession] = useState<GameSession>(initialSession);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredThisRound, setAnsweredThisRound] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const previousStateRef = useRef<string>(initialSession.state);

  // Poll session state & subscribe to real-time events from host
  useEffect(() => {
    const handleUpdate = (live: GameSession) => {
      // If host started the game from lobby -> play countdown audio
      if (previousStateRef.current === 'lobby' && (live.state === 'question_countdown' || live.state === 'question_active')) {
        soundManager.playCountdown();
      }

      // If moved to a new question or countdown, reset local answer state
      if (live.currentQuestionIndex !== session.currentQuestionIndex || live.state === 'question_countdown') {
        if (live.currentQuestionIndex !== session.currentQuestionIndex) {
          setSelectedAnswer(null);
          setAnsweredThisRound(false);
          setLastPointsEarned(null);
        }
      }

      previousStateRef.current = live.state;
      setSession(live);
    };

    // 1. Instant cross-tab/peer sync via BroadcastChannel
    const unsubscribe = subscribeToSessionSync((msg) => {
      if (msg.pin === session.pin && msg.session) {
        handleUpdate(msg.session);
      }
    });

    // 2. High-frequency polling to detect Host state changes immediately (every 300ms)
    const interval = setInterval(async () => {
      const live = await fetchLiveSession(session.pin);
      if (live) {
        handleUpdate(live);
      }
    }, 300);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [session.pin, session.currentQuestionIndex]);

  // Trigger confetti when podium is reached
  useEffect(() => {
    if (session.state === 'podium' && !confettiTriggered) {
      setConfettiTriggered(true);
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
      soundManager.playVictory();
    }
  }, [session.state, confettiTriggered]);

  const currentQ = session.quiz.questions[session.currentQuestionIndex];
  const maxTime = currentQ?.timeLimit || 15;
  const timePercent = Math.max(0, Math.min(100, (session.timeRemaining / maxTime) * 100));

  const handleSelectAnswer = async (optIndex: number) => {
    // Cannot answer if already answered or if game is not actively in question_active state
    if (answeredThisRound || session.state !== 'question_active') return;

    setSelectedAnswer(optIndex);
    setAnsweredThisRound(true);

    const isCorrect = optIndex === currentQ.correctAnswer;
    if (isCorrect) {
      soundManager.playCorrect();
    } else {
      soundManager.playWrong();
    }

    const points = isCorrect ? 1000 : 0;
    setLastPointsEarned(points);

    // Submit answer to server and broadcast
    await submitPlayerAnswer(session.pin, currentPlayer.id, session.currentQuestionIndex, optIndex, isCorrect, points);

    // Update player score locally
    const updatedPlayers = (session.players || []).map(p => {
      if (p.id === currentPlayer.id) {
        const newScore = p.score + points;
        const newStreak = isCorrect ? p.streak + 1 : 0;
        return {
          ...p,
          score: newScore,
          streak: newStreak,
          answers: {
            ...p.answers,
            [session.currentQuestionIndex]: {
              answer: optIndex,
              correct: isCorrect,
              timeTaken: maxTime - session.timeRemaining,
              pointsEarned: points
            }
          }
        };
      }
      return p;
    });

    const updatedSession: GameSession = {
      ...session,
      players: updatedPlayers
    };
    pushLiveSession(updatedSession);
    setSession(updatedSession);
  };

  const colors = [
    'bg-blue-600 hover:bg-blue-500 border-blue-400',
    'bg-indigo-600 hover:bg-indigo-500 border-indigo-400',
    'bg-sky-600 hover:bg-sky-500 border-sky-400',
    'bg-cyan-600 hover:bg-cyan-500 border-cyan-400'
  ];

  const shapes = ['▲', '◆', '●', '■'];

  const livePlayer = (session.players || []).find(p => p.id === currentPlayer.id) || currentPlayer;

  // ----------------------------------------------------------------------------------------
  // 1. STATE: LOBBY (Host has not started the game yet)
  // Client cannot answer or start the game; waits for Host to click "Mulai Game Live"
  // ----------------------------------------------------------------------------------------
  if (session.state === 'lobby') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Top Room Banner */}
        <div className="flex items-center justify-between bg-blue-900 border border-blue-700 rounded-2xl p-4 mb-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{livePlayer.avatar}</span>
            <div>
              <div className="text-white font-bold text-sm flex items-center space-x-2">
                <span>{livePlayer.name}</span>
                <span className="px-2 py-0.5 bg-yellow-400 text-blue-950 rounded text-[10px] font-black uppercase">
                  {lang === 'id' ? 'Anda' : 'You'}
                </span>
              </div>
              <div className="text-blue-300 text-xs font-mono">
                PIN: <strong className="text-yellow-400">{session.pin}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{lang === 'id' ? 'Terhubung ke Room' : 'Connected to Room'}</span>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onLeave();
              }}
              className="p-2 text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 rounded-xl border border-rose-500/30 transition-all text-xs font-semibold flex items-center space-x-1"
              title={t.leaveRoom}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.leaveRoom}</span>
            </button>
          </div>
        </div>

        {/* Main Waiting Card */}
        <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-yellow-400 text-blue-950 flex items-center justify-center mx-auto shadow-2xl shadow-yellow-400/30 animate-bounce">
              <Hourglass className="w-10 h-10" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/30 px-3.5 py-1.5 rounded-full text-yellow-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                <span>{lang === 'id' ? 'Lobby Game Live' : 'Live Game Lobby'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                {t.waitingForHost}
              </h2>
              <p className="text-blue-200 text-sm max-w-lg mx-auto leading-relaxed">
                {t.waitingForHostDesc}
              </p>
            </div>

            {/* Quiz Info Summary Box */}
            <div className="bg-blue-950/80 border border-blue-800 rounded-2xl p-5 max-w-md mx-auto text-left shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-blue-800/80 pb-3">
                <div>
                  <span className="text-xs text-blue-400 font-semibold block">{lang === 'id' ? 'Judul Kuis' : 'Quiz Title'}</span>
                  <span className="text-sm font-bold text-white line-clamp-1">{session.quiz.title}</span>
                </div>
                <span className="text-2xl">{session.quiz.coverImage || '🎯'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-blue-400 block">{lang === 'id' ? 'Total Soal' : 'Total Questions'}</span>
                  <strong className="text-yellow-400 text-sm">{session.quiz.questions.length} {lang === 'id' ? 'Pertanyaan' : 'Questions'}</strong>
                </div>
                <div>
                  <span className="text-blue-400 block">{lang === 'id' ? 'Status Pemain' : 'Your Status'}</span>
                  <strong className="text-emerald-400 text-sm flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Siap Bermain' : 'Ready'}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Waiting notification banner */}
            <div className="p-4 rounded-2xl bg-blue-950/90 border border-yellow-400/30 text-yellow-200 text-xs flex items-center space-x-3 text-left max-w-md mx-auto shadow-md">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 animate-pulse" />
              <span>
                {lang === 'id'
                  ? 'Kuis belum dimulai. Tombol jawaban dan soal akan otomatis aktif begitu Host menekan "Mulai Game Live".'
                  : 'Quiz not started yet. Questions and answer buttons will appear as soon as the Host clicks "Start Live Game".'}
              </span>
            </div>
          </div>
        </div>

        {/* Players In Lobby Grid */}
        <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Users className="w-4 h-4 text-yellow-400" />
              <span>{t.playersInRoom}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-700 text-yellow-300 text-xs font-mono">
                {session.players?.length || 1}
              </span>
            </div>
            <span className="text-xs text-blue-300 animate-pulse">
              ● {lang === 'id' ? 'Sinkronisasi Real-Time' : 'Real-Time Sync'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(session.players || [currentPlayer]).map((p) => {
              const isMe = p.id === currentPlayer.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center space-x-2.5 p-3 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-blue-950 border-yellow-400/80 shadow-md ring-2 ring-yellow-400/30'
                      : 'bg-blue-950/60 border-blue-800'
                  }`}
                >
                  <span className="text-2xl">{p.avatar}</span>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate flex items-center space-x-1">
                      <span>{p.name}</span>
                      {isMe && <span className="text-[10px] text-yellow-400">★</span>}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {isMe ? (lang === 'id' ? 'Anda (Siap)' : 'You (Ready)') : (lang === 'id' ? 'Siap' : 'Ready')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------------------
  // 2. STATE: GAME ACTIVE / COUNTDOWN / REVEAL / PODIUM
  // Host has started the game! Client participates and answers each question
  // ----------------------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between bg-blue-900 border border-blue-700 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{livePlayer.avatar}</span>
          <div>
            <div className="text-white font-bold text-xs">{livePlayer.name}</div>
            <div className="text-yellow-400 text-xs font-mono font-bold">{livePlayer.score} pts</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {livePlayer.streak > 1 && (
            <div className="flex items-center space-x-1 bg-yellow-400/20 border border-yellow-400/40 px-3 py-1 rounded-xl text-yellow-300 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-yellow-400" />
              <span>{livePlayer.streak} Streak</span>
            </div>
          )}
          <span className="px-3 py-1 bg-blue-950 text-blue-200 rounded-lg text-xs font-bold border border-blue-700">
            Q {session.currentQuestionIndex + 1} / {session.quiz.questions.length}
          </span>
        </div>
      </div>

      {/* Countdown to Question Start */}
      {session.state === 'question_countdown' && (
        <div className="text-center py-20 bg-blue-900 border border-blue-700 rounded-3xl shadow-2xl animate-fade-in">
          <h3 className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
            {t.getReady} {session.currentQuestionIndex + 1}
          </h3>
          <div className="text-6xl font-black text-yellow-400 animate-pulse">{session.timeRemaining}</div>
          <p className="text-blue-300 text-xs mt-4">
            {lang === 'id' ? 'Soal kuis akan segera muncul...' : 'Question is about to appear...'}
          </p>
        </div>
      )}

      {/* Active Question Answering */}
      {session.state === 'question_active' && currentQ && (
        <div className="space-y-6">
          {/* Countdown Timer Visual Bar */}
          <div className="bg-blue-900 border border-blue-700 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center space-x-1.5 text-blue-200">
                <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
                <span>{lang === 'id' ? 'Sisa Waktu:' : 'Time Remaining:'}</span>
              </div>
              <span className={`text-sm font-mono font-black ${session.timeRemaining <= 5 ? 'text-rose-400 animate-bounce' : 'text-yellow-400'}`}>
                {session.timeRemaining}s ({maxTime}s limit)
              </span>
            </div>
            <div className="w-full bg-blue-950 h-3 rounded-full overflow-hidden p-0.5 border border-blue-800">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  session.timeRemaining <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-yellow-400'
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
          </div>

          <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 text-center shadow-xl">
            <span className="text-3xl mb-2 block">{currentQ.image || '🎯'}</span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">{currentQ.question}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={answeredThisRound}
                  className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all transform active:scale-98 ${
                    colors[idx % colors.length]
                  } ${isSelected ? 'ring-4 ring-yellow-400 shadow-2xl scale-102 bg-yellow-500 text-blue-950' : 'shadow-lg'} ${
                    answeredThisRound && !isSelected ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 text-left">
                    <span className="text-2xl font-black text-yellow-300">{shapes[idx % shapes.length]}</span>
                    <span className="text-white font-bold text-base sm:text-lg">{opt}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-6 h-6 text-blue-950 fill-yellow-400" />}
                </button>
              );
            })}
          </div>

          {answeredThisRound && (
            <div className="text-center py-4 bg-blue-900 border border-blue-700 rounded-2xl animate-fade-in shadow-lg">
              <p className="text-yellow-300 text-sm font-bold flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {lang === 'id' 
                    ? 'Jawaban terkirim! Menunggu waktu habis atau Host melanjutkan...' 
                    : 'Answer submitted! Waiting for time up or Host to continue...'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Question Reveal: Results of this question */}
      {session.state === 'question_reveal' && currentQ && (
        <div className="space-y-6">
          <div className="text-center py-12 bg-blue-900 border border-blue-700 rounded-3xl p-8 shadow-2xl animate-fade-in">
            {selectedAnswer === currentQ.correctAnswer ? (
              <div>
                <CheckCircle2 className="w-16 h-16 text-yellow-400 mx-auto mb-3 animate-bounce" />
                <h3 className="text-2xl font-black text-white mb-1">{t.correct}</h3>
                <p className="text-yellow-300 text-sm font-bold">+{lastPointsEarned || 1000} {t.pointsAdded}</p>
              </div>
            ) : (
              <div>
                <XCircle className="w-16 h-16 text-rose-300 mx-auto mb-3 animate-pulse" />
                <h3 className="text-2xl font-black text-white mb-1">{t.incorrect}</h3>
                <p className="text-blue-200 text-sm">
                  {t.correctWas} <strong className="text-yellow-400">{currentQ.options[currentQ.correctAnswer]}</strong>
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-blue-800 text-xs text-blue-300 flex items-center justify-center space-x-2 animate-pulse">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>{t.waitingForNextQuestion}</span>
            </div>
          </div>
        </div>
      )}

      {/* Podium: Game Over */}
      {session.state === 'podium' && (
        <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 sm:p-12 text-center shadow-2xl animate-fade-in">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">{t.gameOver}</h2>
          <p className="text-blue-200 text-sm mb-6">{t.finalScore} <strong className="text-yellow-400">{livePlayer.score} pts</strong></p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowShareModal(true);
              }}
              className="px-6 py-3 rounded-xl bg-blue-950 hover:bg-blue-800 text-yellow-400 border border-blue-700 font-bold text-sm shadow-md flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Share2 className="w-4 h-4 text-yellow-400" />
              <span>{t.shareQuiz}</span>
            </button>

            <button
              onClick={onLeave}
              className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30 transition-all transform hover:-translate-y-0.5"
            >
              {t.returnDashboard}
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareQuizModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          quiz={session.quiz}
          gamePin={session.pin}
          lang={lang}
        />
      )}
    </div>
  );
};
