import React from 'react';
import { Trophy, PlusCircle, PlayCircle, QrCode, History, Volume2, VolumeX, Sparkles, Globe } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { Language, translations } from '../utils/i18n';

interface NavbarProps {
  currentTab: 'browse' | 'create' | 'host' | 'join' | 'history';
  setCurrentTab: (tab: 'browse' | 'create' | 'host' | 'join' | 'history') => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenAIModal: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  soundEnabled,
  setSoundEnabled,
  onOpenAIModal,
  lang,
  setLang
}) => {
  const t = translations[lang];

  const toggleSound = () => {
    const next = !soundEnabled;
    soundManager.enabled = next;
    setSoundEnabled(next);
    if (next) soundManager.playClick();
  };

  const toggleLang = () => {
    soundManager.playClick();
    setLang(lang === 'id' ? 'en' : 'id');
  };

  return (
    <header className="sticky top-0 z-50 bg-blue-900/95 backdrop-blur-md border-b border-blue-700/50 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          onClick={() => { soundManager.playClick(); setCurrentTab('browse'); }}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-400/30 group-hover:scale-105 transition-transform text-blue-950 font-black">
            <Trophy className="w-6 h-6 text-blue-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-white tracking-tight flex items-center space-x-1.5">
              <span>QuizArena</span>
              <span className="text-yellow-400">Live</span>
            </h1>
            <p className="text-xs text-blue-200">QR Scan & Custom Trivia Battles</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => { soundManager.playClick(); setCurrentTab('browse'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentTab === 'browse'
                ? 'bg-yellow-400 text-blue-950 shadow-lg shadow-yellow-400/30 font-bold'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{t.navBrowse}</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); setCurrentTab('create'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentTab === 'create'
                ? 'bg-yellow-400 text-blue-950 shadow-lg shadow-yellow-400/30 font-bold'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.navCreate}</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); setCurrentTab('host'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentTab === 'host'
                ? 'bg-yellow-400 text-blue-950 shadow-lg shadow-yellow-400/30 font-bold'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{t.navHost}</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); setCurrentTab('join'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentTab === 'join'
                ? 'bg-yellow-400 text-blue-950 shadow-lg shadow-yellow-400/30 font-bold'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>{t.navJoin}</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); setCurrentTab('history'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              currentTab === 'history'
                ? 'bg-yellow-400 text-blue-950 shadow-lg shadow-yellow-400/30 font-bold'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t.navHistory}</span>
          </button>
        </nav>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={toggleLang}
            className="px-3 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-yellow-300 transition-colors border border-blue-700 flex items-center space-x-1.5 text-xs font-bold"
            title="Switch Language (ID / EN)"
          >
            <Globe className="w-4 h-4 text-yellow-400" />
            <span>{lang.toUpperCase()}</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); onOpenAIModal(); }}
            className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black shadow-lg shadow-yellow-400/25 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-blue-950 animate-pulse" />
            <span>{t.aiGenerator}</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-yellow-300 transition-colors border border-blue-700"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-yellow-400" /> : <VolumeX className="w-5 h-5 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around bg-blue-950 border-t border-blue-800 py-2.5 px-2">
        <button
          onClick={() => { soundManager.playClick(); setCurrentTab('browse'); }}
          className={`flex flex-col items-center space-y-1 text-xs ${currentTab === 'browse' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}
        >
          <Trophy className="w-5 h-5" />
          <span>Browse</span>
        </button>
        <button
          onClick={() => { soundManager.playClick(); setCurrentTab('create'); }}
          className={`flex flex-col items-center space-y-1 text-xs ${currentTab === 'create' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create</span>
        </button>
        <button
          onClick={() => { soundManager.playClick(); setCurrentTab('host'); }}
          className={`flex flex-col items-center space-y-1 text-xs ${currentTab === 'host' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}
        >
          <QrCode className="w-5 h-5" />
          <span>Host</span>
        </button>
        <button
          onClick={() => { soundManager.playClick(); setCurrentTab('history'); }}
          className={`flex flex-col items-center space-y-1 text-xs ${currentTab === 'history' ? 'text-yellow-400 font-bold' : 'text-blue-300'}`}
        >
          <History className="w-5 h-5" />
          <span>History</span>
        </button>
      </div>
    </header>
  );
};
