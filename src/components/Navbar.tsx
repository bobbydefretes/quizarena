import React, { useState } from 'react';
import { Trophy, PlusCircle, PlayCircle, QrCode, History, Volume2, VolumeX, Sparkles, Globe, Music, Settings, X } from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const [bgmActive, setBgmActive] = useState(soundManager.bgmEnabled);
  const [bgmVol, setBgmVol] = useState(soundManager.bgmVolume * 100);

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

  const toggleBGM = () => {
    soundManager.playClick();
    const next = !bgmActive;
    setBgmActive(next);
    soundManager.toggleBGM(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBgmVol(val);
    soundManager.bgmVolume = val / 100;
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
            onClick={() => { soundManager.playClick(); setShowSettings(true); }}
            className="p-2.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-yellow-300 transition-colors border border-blue-700 relative"
            title="Audio & BGM Settings"
          >
            <Settings className="w-5 h-5 text-yellow-400" />
            {bgmActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            )}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-blue-900 border border-blue-700 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-800">
              <div className="flex items-center space-x-2">
                <Music className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">BGM & Audio Settings</h3>
              </div>
              <button
                onClick={() => { soundManager.playClick(); setShowSettings(false); }}
                className="p-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-950 p-4 rounded-2xl border border-blue-800">
                <div>
                  <div className="text-white font-bold text-sm">{t.bgmMusic}</div>
                  <div className="text-xs text-blue-300">Loop ambient BGM during lobby and active quiz</div>
                </div>
                <button
                  onClick={toggleBGM}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
                    bgmActive ? 'bg-yellow-400' : 'bg-blue-800'
                  }`}
                >
                  <div
                    className={`bg-blue-950 w-6 h-6 rounded-full shadow-md transform transition-transform ${
                      bgmActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="bg-blue-950 p-4 rounded-2xl border border-blue-800 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>{t.bgmVolume}</span>
                  <span className="text-yellow-400 font-mono">{Math.round(bgmVol)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bgmVol}
                  onChange={handleVolumeChange}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>

              <button
                onClick={() => { soundManager.playClick(); setShowSettings(false); }}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

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
