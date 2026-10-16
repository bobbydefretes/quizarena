import React, { useState } from 'react';
import { GameHistoryRecord, Language } from '../types';
import { getGameHistory } from '../utils/storage';
import { translations } from '../utils/i18n';
import { History, Trophy, Calendar, Award, Play, Trash2 } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface GameHistoryViewProps {
  lang: Language;
  onNavigateBrowse: () => void;
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({
  lang,
  onNavigateBrowse
}) => {
  const t = translations[lang];
  const [history, setHistory] = useState<GameHistoryRecord[]>(getGameHistory());

  const clearHistory = () => {
    if (window.confirm(lang === 'id' ? 'Hapus semua riwayat permainan?' : 'Clear all game history?')) {
      soundManager.playClick();
      localStorage.removeItem('quizarena_game_history_v1');
      setHistory([]);
    }
  };

  const totalGames = history.length;
  const highestScore = totalGames > 0 ? Math.max(...history.map(h => h.score)) : 0;
  const avgScore = totalGames > 0 ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / totalGames) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-yellow-400 text-blue-950 text-xs font-black mb-3 shadow-md">
            <History className="w-3.5 h-3.5" />
            <span>{t.gameHistoryTitle}</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t.gameHistoryTitle}</h1>
          <p className="text-blue-200 text-sm mt-1">{t.gameHistorySubtitle}</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-rose-900/60 text-blue-200 hover:text-rose-200 text-xs font-bold border border-blue-700 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Hapus Riwayat' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-900/80 border border-blue-700 rounded-2xl p-6 shadow-xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black text-xl shadow-md">
            🎮
          </div>
          <div>
            <div className="text-blue-200 text-xs font-semibold">{t.totalGamesPlayed}</div>
            <div className="text-2xl font-black text-white">{totalGames}</div>
          </div>
        </div>

        <div className="bg-blue-900/80 border border-blue-700 rounded-2xl p-6 shadow-xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black text-xl shadow-md">
            🏆
          </div>
          <div>
            <div className="text-blue-200 text-xs font-semibold">{t.highestScoreAchieved}</div>
            <div className="text-2xl font-black text-yellow-400">{highestScore} pts</div>
          </div>
        </div>

        <div className="bg-blue-900/80 border border-blue-700 rounded-2xl p-6 shadow-xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black text-xl shadow-md">
            ⭐
          </div>
          <div>
            <div className="text-blue-200 text-xs font-semibold">{lang === 'id' ? 'Rata-rata Skor' : 'Average Score'}</div>
            <div className="text-2xl font-black text-white">{avgScore} pts</div>
          </div>
        </div>
      </div>

      {/* History Records List */}
      {history.length === 0 ? (
        <div className="text-center py-20 bg-blue-900/30 rounded-3xl border border-blue-700">
          <History className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t.noHistoryYet}</h3>
          <p className="text-blue-200 text-sm mb-6">{t.noHistoryDesc}</p>
          <button
            onClick={() => { soundManager.playClick(); onNavigateBrowse(); }}
            className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30"
          >
            {t.navBrowse}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div
              key={record.id}
              className="bg-blue-900/80 border border-blue-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-700 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                  🎯
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                      {record.mode}
                    </span>
                    <span className="text-xs text-blue-300 bg-blue-950 px-2.5 py-0.5 rounded-md">
                      {record.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{record.quizTitle}</h3>
                  <div className="flex items-center space-x-2 text-xs text-blue-300 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{new Date(record.datePlayed).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-800">
                <div className="text-right">
                  <div className="text-xs text-blue-300 font-semibold">{t.score}</div>
                  <div className="text-2xl font-black text-yellow-400 font-mono">{record.score} <span className="text-xs text-blue-200">pts</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
