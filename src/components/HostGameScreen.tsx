import React, { useEffect, useState } from 'react';
import { GameSession } from '../types';
import { saveActiveSession, getActiveSession } from '../utils/storage';
import { Clock, CheckCircle2, Trophy, ArrowRight, BarChart3, TrendingUp } from 'lucide-react';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

interface HostGameScreenProps {
  initialSession: GameSession;
  onGameOver: (session: GameSession) => void;
}

export const HostGameScreen: React.FC<HostGameScreenProps> = ({
  initialSession,
  onGameOver
}) => {
  const [session, setSession] = useState<GameSession>(initialSession);
  const [timeRemaining, setTimeRemaining] = useState<number>(3); // Countdown state
  const [activeTab, setActiveTab] = useState<'game' | 'analytics'>('game');

  const currentQ = session.quiz.questions[session.currentQuestionIndex];
  const totalQ = session.quiz.questions.length;

  // Poll for player updates and handle timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const live = getActiveSession(session.pin);
      if (live) {
        setSession(live);
      }
    }, 500);

    return () => clearInterval(timerInterval);
  }, [session.pin]);

  // Main Game Loop Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev > 1) {
          if (session.state === 'question_active') {
            soundManager.playCountdown();
          }
          return prev - 1;
        }

        // Time expired or countdown finished -> transition state
        if (session.state === 'question_countdown') {
          const qTime = currentQ.timeLimit || 15;
          const updated: GameSession = {
            ...session,
            state: 'question_active',
            timeRemaining: qTime
          };
          saveActiveSession(updated);
          setSession(updated);
          return qTime;
        } else if (session.state === 'question_active') {
          soundManager.playWrong();
          const updated: GameSession = {
            ...session,
            state: 'question_reveal',
            timeRemaining: 5
          };
          saveActiveSession(updated);
          setSession(updated);
          return 5;
        } else if (session.state === 'question_reveal') {
          if (session.currentQuestionIndex + 1 < totalQ) {
            const updated: GameSession = {
              ...session,
              state: 'question_countdown',
              currentQuestionIndex: session.currentQuestionIndex + 1,
              timeRemaining: 3
            };
            saveActiveSession(updated);
            setSession(updated);
            return 3;
          } else {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            soundManager.playVictory();
            const updated: GameSession = {
              ...session,
              state: 'podium',
              timeRemaining: 0
            };
            saveActiveSession(updated);
            setSession(updated);
            onGameOver(updated);
            return 0;
          }
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.state, session.currentQuestionIndex, totalQ, currentQ, session]);

  const handleNextManually = () => {
    soundManager.playClick();
    if (session.state === 'question_active') {
      const updated: GameSession = {
        ...session,
        state: 'question_reveal',
        timeRemaining: 5
      };
      saveActiveSession(updated);
      setSession(updated);
      setTimeRemaining(5);
    } else if (session.state === 'question_reveal') {
      if (session.currentQuestionIndex + 1 < totalQ) {
        const updated: GameSession = {
          ...session,
          state: 'question_countdown',
          currentQuestionIndex: session.currentQuestionIndex + 1,
          timeRemaining: 3
        };
        saveActiveSession(updated);
        setSession(updated);
        setTimeRemaining(3);
      } else {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        soundManager.playVictory();
        const updated: GameSession = {
          ...session,
          state: 'podium',
          timeRemaining: 0
        };
        saveActiveSession(updated);
        setSession(updated);
        onGameOver(updated);
      }
    }
  };

  const colors = [
    'bg-blue-600 border-blue-400',
    'bg-indigo-600 border-indigo-400',
    'bg-sky-600 border-sky-400',
    'bg-cyan-600 border-cyan-400'
  ];

  const shapes = ['▲', '◆', '●', '■'];

  const sortedPlayers = [...(session.players || [])].sort((a, b) => b.score - a.score);

  // Prepare Recharts data for Player Scores
  const scoreChartData = sortedPlayers.slice(0, 6).map(p => ({
    name: p.name,
    score: p.score
  }));

  // Prepare Recharts data for Question Accuracy Trend
  const accuracyChartData = session.quiz.questions.slice(0, session.currentQuestionIndex + (session.state === 'question_reveal' ? 1 : 0)).map((q, idx) => {
    const players = session.players || [];
    let correctCount = 0;
    let totalAnswers = 0;
    players.forEach(p => {
      if (p.answers && p.answers[idx]) {
        totalAnswers++;
        if (p.answers[idx].correct) correctCount++;
      }
    });
    const accuracy = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;
    return {
      question: `Q${idx + 1}`,
      accuracy: accuracy,
      correct: correctCount
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-blue-900 border border-blue-700 rounded-2xl p-4 mb-8 shadow-xl gap-4">
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-yellow-400 text-blue-950 rounded-lg text-xs font-black">
            Q {session.currentQuestionIndex + 1} / {totalQ}
          </span>
          <span className="text-blue-100 text-sm font-semibold">PIN: <strong className="text-yellow-400 font-mono">{session.pin}</strong></span>
        </div>

        <div className="flex items-center space-x-2 bg-blue-950 p-1 rounded-xl border border-blue-700">
          <button
            onClick={() => { soundManager.playClick(); setActiveTab('game'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'game' ? 'bg-yellow-400 text-blue-950 shadow-sm' : 'text-blue-200 hover:text-white'
            }`}
          >
            Live Game
          </button>
          <button
            onClick={() => { soundManager.playClick(); setActiveTab('analytics'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-yellow-400 text-blue-950 shadow-sm' : 'text-blue-200 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Recharts Analytics</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white text-sm font-bold bg-blue-950 px-4 py-1.5 rounded-xl border border-blue-700">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span>{timeRemaining}s</span>
          </div>

          <button
            onClick={handleNextManually}
            className="px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black flex items-center space-x-1 transition-all shadow-md shadow-yellow-400/30"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Players Score Bar Chart */}
            <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-white font-bold text-base">Top Player Scores (Real-Time)</h3>
              </div>
              <div className="h-72 w-full">
                {scoreChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-blue-300 text-xs">
                    No players scored yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                      <XAxis dataKey="name" stroke="#93c5fd" fontSize={12} />
                      <YAxis stroke="#93c5fd" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#172554', borderColor: '#3b82f6', borderRadius: '12px', color: '#fff' }}
                      />
                      <Bar dataKey="score" fill="#facc15" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Question Accuracy Trend Line Chart */}
            <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <h3 className="text-white font-bold text-base">Question Accuracy Trend (%)</h3>
              </div>
              <div className="h-72 w-full">
                {accuracyChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-blue-300 text-xs">
                    Accuracy data will appear as questions are answered.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                      <XAxis dataKey="question" stroke="#93c5fd" fontSize={12} />
                      <YAxis stroke="#93c5fd" fontSize={12} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#172554', borderColor: '#3b82f6', borderRadius: '12px', color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="accuracy" stroke="#facc15" strokeWidth={3} dot={{ fill: '#facc15', r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {session.state === 'question_countdown' && (
            <div className="text-center py-24 bg-blue-900 border border-blue-700 rounded-3xl shadow-2xl animate-fade-in">
              <span className="text-6xl mb-4 block">{currentQ.image || '🎯'}</span>
              <h3 className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-2">Get Ready! Question {session.currentQuestionIndex + 1}</h3>
              <div className="text-7xl font-black text-yellow-400 animate-pulse">{timeRemaining}</div>
            </div>
          )}

          {(session.state === 'question_active' || session.state === 'question_reveal') && (
            <div className="space-y-8">
              {/* Question Box */}
              <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                <span className="text-4xl mb-3 block">{currentQ.image || '💡'}</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight max-w-3xl mx-auto leading-snug">
                  {currentQ.question}
                </h2>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, idx) => {
                  const isCorrect = idx === currentQ.correctAnswer;
                  const showReveal = session.state === 'question_reveal';
                  return (
                    <div
                      key={idx}
                      className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all ${
                        colors[idx % colors.length]
                      } ${showReveal && !isCorrect ? 'opacity-40 grayscale' : ''} ${
                        showReveal && isCorrect ? 'ring-4 ring-yellow-400 shadow-2xl scale-102 bg-yellow-500 text-blue-950' : 'shadow-lg'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-black text-yellow-300">{shapes[idx % shapes.length]}</span>
                        <span className="text-white font-bold text-base sm:text-lg">{opt}</span>
                      </div>
                      {showReveal && isCorrect && (
                        <CheckCircle2 className="w-7 h-7 text-yellow-300 flex-shrink-0 animate-bounce" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Leaderboard preview */}
              <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center space-x-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-bold text-base">Live Leaderboard</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sortedPlayers.slice(0, 4).map((p, idx) => (
                    <div key={p.id} className="bg-blue-950 border border-blue-700 rounded-xl p-3 flex items-center space-x-3">
                      <span className="text-lg font-black text-yellow-400">#{idx + 1}</span>
                      <span className="text-xl">{p.avatar}</span>
                      <div className="truncate">
                        <div className="text-white text-xs font-bold truncate">{p.name}</div>
                        <div className="text-yellow-300 text-xs font-mono font-semibold">{p.score} pts</div>
                      </div>
                    </div>
                  ))}
                  {sortedPlayers.length === 0 && (
                    <div className="col-span-full text-center text-xs text-blue-300 py-4">
                      No player answers recorded yet for this round.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {session.state === 'podium' && (
            <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 sm:p-12 text-center shadow-2xl animate-fade-in">
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Final Podium & Results!</h2>
              <p className="text-blue-200 text-sm mb-8">Congratulations to the top trivia champions!</p>

              <div className="max-w-md mx-auto space-y-3 mb-8">
                {sortedPlayers.slice(0, 3).map((p, idx) => (
                  <div key={p.id} className={`p-4 rounded-2xl flex items-center justify-between border ${
                    idx === 0 ? 'bg-yellow-400/20 border-yellow-400' :
                    idx === 1 ? 'bg-blue-950 border-blue-700' :
                    'bg-blue-950/70 border-blue-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-black text-yellow-400">#{idx + 1}</span>
                      <span className="text-2xl">{p.avatar}</span>
                      <span className="text-white font-bold text-sm">{p.name}</span>
                    </div>
                    <span className="text-yellow-300 font-mono font-bold text-base">{p.score} pts</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-xl shadow-yellow-400/30"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
