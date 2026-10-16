import React, { useEffect, useState } from 'react';
import { GameSession, Player, Language } from '../types';
import { getActiveSession, saveActiveSession } from '../utils/storage';
import { translations } from '../utils/i18n';
import { Trophy, CheckCircle2, XCircle, Flame, Clock } from 'lucide-react';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';

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

  // Poll session state
  useEffect(() => {
    const interval = setInterval(() => {
      const live = getActiveSession(session.pin);
      if (live) {
        if (live.currentQuestionIndex !== session.currentQuestionIndex || live.state === 'question_countdown') {
          if (live.currentQuestionIndex !== session.currentQuestionIndex) {
            setSelectedAnswer(null);
            setAnsweredThisRound(false);
            setLastPointsEarned(null);
          }
        }
        setSession(live);
      }
    }, 500);

    return () => clearInterval(interval);
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

  const handleSelectAnswer = (optIndex: number) => {
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

    // Update player score in session
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
              timeTaken: 5,
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
    saveActiveSession(updatedSession);
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

      {session.state === 'question_countdown' && (
        <div className="text-center py-20 bg-blue-900 border border-blue-700 rounded-3xl shadow-2xl animate-fade-in">
          <h3 className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">{t.getReady} {session.currentQuestionIndex + 1}</h3>
          <div className="text-6xl font-black text-yellow-400 animate-pulse">{session.timeRemaining}</div>
        </div>
      )}

      {session.state === 'question_active' && currentQ && (
        <div className="space-y-6">
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
                    answeredThisRound && !isSelected ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 text-left">
                    <span className="text-2xl font-black text-yellow-300">{shapes[idx % shapes.length]}</span>
                    <span className="text-white font-bold text-base sm:text-lg">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {answeredThisRound && (
            <div className="text-center py-4 bg-blue-900 border border-blue-700 rounded-2xl animate-fade-in">
              <p className="text-yellow-300 text-sm font-bold">{t.answerSubmitted}</p>
            </div>
          )}
        </div>
      )}

      {session.state === 'question_reveal' && currentQ && (
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
              <p className="text-blue-200 text-sm">{t.correctWas} <strong className="text-yellow-400">{currentQ.options[currentQ.correctAnswer]}</strong></p>
            </div>
          )}
        </div>
      )}

      {session.state === 'podium' && (
        <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">{t.gameOver}</h2>
          <p className="text-blue-200 text-sm mb-6">{t.finalScore} <strong className="text-yellow-400">{livePlayer.score} pts</strong></p>

          <button
            onClick={onLeave}
            className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30"
          >
            {t.returnDashboard}
          </button>
        </div>
      )}
    </div>
  );
};
