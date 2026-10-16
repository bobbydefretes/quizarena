import React, { useState, useEffect } from 'react';
import { Quiz, GameSession, Player } from './types';
import { getStoredQuizzes, saveQuiz, deleteQuiz, getActiveSession } from './utils/storage';
import { Language } from './utils/i18n';
import { Navbar } from './components/Navbar';
import { QuizList } from './components/QuizList';
import { QuizEditor } from './components/QuizEditor';
import { AIGeneratorModal } from './components/AIGeneratorModal';
import { HostLobby } from './components/HostLobby';
import { HostGameScreen } from './components/HostGameScreen';
import { PlayerJoin } from './components/PlayerJoin';
import { PlayerGameScreen } from './components/PlayerGameScreen';
import { SoloGameModal } from './components/SoloGameModal';
import { GameHistoryView } from './components/GameHistoryView';

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(getStoredQuizzes());
  const [currentTab, setCurrentTab] = useState<'browse' | 'create' | 'host' | 'join' | 'history'>('browse');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState<Language>('id'); // Default to Indonesian

  // Modals & Active Modes
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [soloQuiz, setSoloQuiz] = useState<Quiz | null>(null);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [activeHostSession, setActiveHostSession] = useState<GameSession | null>(null);
  const [playerGame, setPlayerGame] = useState<{ session: GameSession; player: Player } | null>(null);
  const [initialJoinPin, setInitialJoinPin] = useState('');

  // Check URL query parameters for ?pin=XXXXXX on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setInitialJoinPin(pinParam);
      setCurrentTab('join');
    }
  }, []);

  const handleSaveQuiz = (quiz: Quiz) => {
    saveQuiz(quiz);
    setQuizzes(getStoredQuizzes());
    setEditingQuiz(null);
    setCurrentTab('browse');
  };

  const handleDeleteQuiz = (quizId: string) => {
    deleteQuiz(quizId);
    setQuizzes(getStoredQuizzes());
  };

  const handleAIQuizGenerated = (quiz: Quiz) => {
    saveQuiz(quiz);
    setQuizzes(getStoredQuizzes());
    setSoloQuiz(quiz);
  };

  return (
    <div className="min-h-screen bg-blue-950 text-white flex flex-col selection:bg-yellow-400 selection:text-blue-950">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setHostingQuiz(null);
          setActiveHostSession(null);
          setPlayerGame(null);
          setEditingQuiz(null);
        }}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        lang={lang}
        setLang={setLang}
      />

      <main className="flex-1">
        {activeHostSession ? (
          <HostGameScreen
            initialSession={activeHostSession}
            onGameOver={(session) => {
              setActiveHostSession(session);
            }}
            lang={lang}
          />
        ) : hostingQuiz ? (
          <HostLobby
            quiz={hostingQuiz}
            onStartGame={(session) => {
              setActiveHostSession(session);
              setHostingQuiz(null);
            }}
            onBack={() => setHostingQuiz(null)}
            lang={lang}
          />
        ) : playerGame ? (
          <PlayerGameScreen
            initialSession={playerGame.session}
            currentPlayer={playerGame.player}
            onLeave={() => {
              setPlayerGame(null);
              setCurrentTab('browse');
            }}
            lang={lang}
          />
        ) : editingQuiz || currentTab === 'create' ? (
          <QuizEditor
            initialQuiz={editingQuiz}
            onSave={handleSaveQuiz}
            onCancel={() => {
              setEditingQuiz(null);
              setCurrentTab('browse');
            }}
            onOpenAIModal={() => setIsAIModalOpen(true)}
            lang={lang}
          />
        ) : currentTab === 'join' ? (
          <PlayerJoin
            initialPin={initialJoinPin}
            onJoined={(session, player) => {
              setPlayerGame({ session, player });
            }}
            lang={lang}
          />
        ) : currentTab === 'history' ? (
          <GameHistoryView
            lang={lang}
            onNavigateBrowse={() => setCurrentTab('browse')}
          />
        ) : currentTab === 'host' ? (
          <div className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h2 className="text-3xl font-black text-white mb-3">
              {lang === 'id' ? 'Host Game Kuis Live' : 'Host a Live Quiz Game'}
            </h2>
            <p className="text-blue-200 text-sm mb-8">
              {lang === 'id' 
                ? 'Pilih kuis di bawah untuk menghasilkan PIN Game dan QR Code agar pemain dapat bergabung!' 
                : 'Select any quiz below to generate a Game PIN and QR Code for players to join!'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {quizzes.map((q) => (
                <div key={q.id} className="bg-blue-900 border border-blue-700 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <span className="text-3xl p-2 bg-blue-950 rounded-xl inline-block mb-3 border border-blue-800">{q.coverImage || '🎯'}</span>
                    <h3 className="text-lg font-bold text-white mb-1">{q.title}</h3>
                    <p className="text-blue-200 text-xs line-clamp-2">{q.description}</p>
                  </div>
                  <div className="pt-6 mt-4 border-t border-blue-800 flex items-center justify-between">
                    <span className="text-xs text-blue-300">{q.questions.length} {lang === 'id' ? 'pertanyaan' : 'questions'}</span>
                    <button
                      onClick={() => setHostingQuiz(q)}
                      className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-lg shadow-yellow-400/30"
                    >
                      {lang === 'id' ? 'Host Live' : 'Host Live'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <QuizList
            quizzes={quizzes}
            onPlaySolo={(quiz) => setSoloQuiz(quiz)}
            onHostLive={(quiz) => setHostingQuiz(quiz)}
            onEditQuiz={(quiz) => {
              setEditingQuiz(quiz);
              setCurrentTab('create');
            }}
            onDeleteQuiz={handleDeleteQuiz}
            onOpenAIModal={() => setIsAIModalOpen(true)}
            onNavigateCreate={() => {
              setEditingQuiz(null);
              setCurrentTab('create');
            }}
            lang={lang}
          />
        )}
      </main>

      {/* Solo Play Modal */}
      {soloQuiz && (
        <SoloGameModal
          quiz={soloQuiz}
          onClose={() => setSoloQuiz(null)}
          lang={lang}
        />
      )}

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onQuizGenerated={handleAIQuizGenerated}
        lang={lang}
      />

      <footer className="bg-blue-900/60 border-t border-blue-800 py-6 text-center text-xs text-blue-300">
        <p>QuizArena Live • {lang === 'id' ? 'Kuis Kustom, Multiplayer QR Code & Trivia AI' : 'Custom Quizzes, QR Code Multiplayer & AI Trivia'}</p>
      </footer>
    </div>
  );
}
