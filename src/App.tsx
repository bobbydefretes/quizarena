import React, { useState, useEffect } from 'react';
import { Quiz, GameSession, Player } from './types';
import { getStoredQuizzes, saveQuiz, deleteQuiz } from './utils/storage';
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
import { Trophy, Play, PlusCircle, Globe } from 'lucide-react';
import { soundManager } from './utils/sound';

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(getStoredQuizzes());
  const [currentTab, setCurrentTab] = useState<'browse' | 'create' | 'host' | 'join' | 'history'>('browse');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState<Language>('id');
  const [userRole, setUserRole] = useState<'host' | 'player' | null>(null);
  const [isClientMode, setIsClientMode] = useState(false);

  // Modals & Active Modes
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [soloQuiz, setSoloQuiz] = useState<Quiz | null>(null);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [activeHostSession, setActiveHostSession] = useState<GameSession | null>(null);
  const [playerGame, setPlayerGame] = useState<{ session: GameSession; player: Player } | null>(null);
  const [initialJoinPin, setInitialJoinPin] = useState('');

  // Check URL query parameters for ?pin=XXXXXX & client=true on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const clientParam = params.get('client');
    if (pinParam) {
      setInitialJoinPin(pinParam);
      setCurrentTab('join');
      setUserRole('player');
      if (clientParam === 'true') {
        setIsClientMode(true);
      }
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

  const toggleLang = () => {
    soundManager.playClick();
    setLang(lang === 'id' ? 'en' : 'id');
  };

  // Role Selection Screen if userRole is null
  if (userRole === null && !initialJoinPin) {
    return (
      <div className="min-h-screen bg-blue-950 text-white flex flex-col items-center justify-center p-4 selection:bg-yellow-400 selection:text-blue-950 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="absolute top-6 right-6">
          <button
            onClick={toggleLang}
            className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 transition-colors border border-blue-700 flex items-center space-x-1.5 text-xs font-bold shadow-md"
          >
            <Globe className="w-4 h-4 text-yellow-400" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>

        <div className="max-w-xl w-full text-center space-y-8 z-10">
          <div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-400/30">
              <Trophy className="w-10 h-10 text-blue-950" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
              QuizArena <span className="text-yellow-400">Live</span>
            </h1>
            <p className="text-blue-200 text-base">
              {lang === 'id' ? 'Pilih peran Anda untuk mulai menggunakan aplikasi:' : 'Choose your role to get started:'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Host Card */}
            <button
              onClick={() => {
                soundManager.playClick();
                setUserRole('host');
                setCurrentTab('create');
              }}
              className="bg-blue-900/90 border-2 border-blue-700 hover:border-yellow-400 rounded-3xl p-8 text-left transition-all transform hover:-translate-y-1 shadow-2xl group flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center text-2xl mb-4 font-black shadow-md group-hover:scale-110 transition-transform">
                  👑
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Host</h3>
                <p className="text-blue-200 text-xs leading-relaxed">
                  {lang === 'id' 
                    ? 'Buat kuis kustom, kelola pertanyaan, dan host game live dengan QR Code.' 
                    : 'Create custom quizzes, manage questions, and host live games with QR Code.'}
                </p>
              </div>
              <div className="mt-6 flex items-center space-x-2 text-yellow-400 font-bold text-xs">
                <PlusCircle className="w-4 h-4" />
                <span>{lang === 'id' ? 'Menu Buat Kuis & Host' : 'Create & Host Menu'}</span>
              </div>
            </button>

            {/* Player Card */}
            <button
              onClick={() => {
                soundManager.playClick();
                setUserRole('player');
                setCurrentTab('join');
              }}
              className="bg-blue-900/90 border-2 border-blue-700 hover:border-yellow-400 rounded-3xl p-8 text-left transition-all transform hover:-translate-y-1 shadow-2xl group flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center text-2xl mb-4 font-black shadow-md group-hover:scale-110 transition-transform">
                  🎮
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Player</h3>
                <p className="text-blue-200 text-xs leading-relaxed">
                  {lang === 'id' 
                    ? 'Gabung ke game menggunakan PIN atau scan QR code untuk bermain kuis.' 
                    : 'Join game using PIN or scan QR code to play quizzes.'}
                </p>
              </div>
              <div className="mt-6 flex items-center space-x-2 text-yellow-400 font-bold text-xs">
                <Play className="w-4 h-4 fill-yellow-400" />
                <span>{lang === 'id' ? 'Menu Gabung Game' : 'Join Game Menu'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-950 text-white flex flex-col selection:bg-yellow-400 selection:text-blue-950">
      {/* Navbar with role restriction */}
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
        userRole={userRole}
        onSwitchRole={() => setUserRole(null)}
      />

      <main className="flex-1">
        {userRole === 'player' ? (
          playerGame ? (
            <PlayerGameScreen
              initialSession={playerGame.session}
              currentPlayer={playerGame.player}
              onLeave={() => {
                setPlayerGame(null);
                setCurrentTab('join');
              }}
              lang={lang}
            />
          ) : (
            <PlayerJoin
              initialPin={initialJoinPin}
              onJoined={(session, player) => {
                setPlayerGame({ session, player });
              }}
              lang={lang}
            />
          )
        ) : (
          // Host Mode
          activeHostSession ? (
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
          )
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
