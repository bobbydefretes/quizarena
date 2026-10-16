import React, { useState } from 'react';
import { Quiz } from '../types';
import { Search, Play, QrCode, Edit3, Trash2, Sparkles, Clock, HelpCircle, User, PlusCircle } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { Language, translations } from '../utils/i18n';

interface QuizListProps {
  quizzes: Quiz[];
  onPlaySolo: (quiz: Quiz) => void;
  onHostLive: (quiz: Quiz) => void;
  onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onOpenAIModal: () => void;
  onNavigateCreate: () => void;
  lang: Language;
}

export const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  onPlaySolo,
  onHostLive,
  onEditQuiz,
  onDeleteQuiz,
  onOpenAIModal,
  onNavigateCreate,
  lang
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [t.allCategories, ...Array.from(new Set(quizzes.map(q => q.category)))];

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === t.allCategories || q.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 border border-yellow-400/30 shadow-2xl p-8 sm:p-12 mb-10">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -top-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-yellow-400 text-blue-950 text-xs font-extrabold mb-4 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-950" />
            <span>Interactive Multiplayer & Custom Quizzes</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            {t.heroTitle}
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-8 leading-relaxed font-medium">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => { soundManager.playClick(); onNavigateCreate(); }}
              className="px-6 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black shadow-lg shadow-yellow-400/30 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t.createQuizBtn}</span>
            </button>
            <button
              onClick={() => { soundManager.playClick(); onOpenAIModal(); }}
              className="px-6 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold border border-blue-700 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 shadow-lg"
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span>{t.aiGenerator}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-blue-900/60 border border-blue-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-sm shadow-inner"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { soundManager.playClick(); setSelectedCategory(cat); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-yellow-400 text-blue-950 shadow-md shadow-yellow-400/30'
                  : 'bg-blue-900/60 text-blue-200 hover:text-white hover:bg-blue-800 border border-blue-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-20 bg-blue-900/30 rounded-3xl border border-blue-800">
          <HelpCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t.noQuizzes}</h3>
          <p className="text-blue-200 text-sm mb-6">{t.noQuizzesDesc}</p>
          <button
            onClick={() => { soundManager.playClick(); onNavigateCreate(); }}
            className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30"
          >
            {t.createQuizBtn}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-blue-900/80 border border-blue-700/60 hover:border-yellow-400 transition-all duration-300 flex flex-col justify-between shadow-xl group rounded-2xl overflow-hidden"
            >
              <div>
                {/* Header / Cover */}
                <div className="p-6 pb-4 bg-gradient-to-b from-blue-800/80 to-transparent border-b border-blue-800/80">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl p-2 bg-blue-950 rounded-xl shadow-inner border border-blue-700">
                      {quiz.coverImage || '🎯'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        quiz.difficulty === 'Easy' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' :
                        quiz.difficulty === 'Medium' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
                        'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                      }`}>
                        {quiz.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors line-clamp-1 mb-1.5">
                    {quiz.title}
                  </h3>
                  <p className="text-blue-200 text-xs line-clamp-2 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>

                {/* Details */}
                <div className="p-6 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
                    <div className="flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-yellow-400" />
                      <span>{quiz.questions.length} {t.questionsCount}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-yellow-300" />
                      <span>~{quiz.questions.reduce((acc, q) => acc + q.timeLimit, 0)}s {t.totalTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-blue-300 pt-2 border-t border-blue-800/80">
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-blue-300" />
                      <span>{quiz.creatorName}</span>
                    </div>
                    <span className="bg-blue-950 px-2.5 py-0.5 rounded-md text-yellow-300 font-semibold">{quiz.category}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-blue-950 border-t border-blue-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { soundManager.playClick(); onPlaySolo(quiz); }}
                    className="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors border border-blue-700 shadow-sm"
                    title="Play Solo"
                  >
                    <Play className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span>{t.playSolo}</span>
                  </button>
                  <button
                    onClick={() => { soundManager.playClick(); onHostLive(quiz); }}
                    className="px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black flex items-center space-x-1.5 transition-colors shadow-lg shadow-yellow-400/20"
                    title="Host Live Game with QR"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{t.hostLive}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => { soundManager.playClick(); onEditQuiz(quiz); }}
                    className="p-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-blue-200 hover:text-white transition-colors"
                    title="Edit Quiz"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
                        soundManager.playClick();
                        onDeleteQuiz(quiz.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-blue-800 hover:bg-rose-900/60 text-blue-200 hover:text-rose-300 transition-colors"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
