import React, { useState } from 'react';
import { Quiz, Language } from '../types';
import { saveGameHistoryRecord } from '../utils/storage';
import { translations } from '../utils/i18n';
import { Trophy, CheckCircle2, XCircle, ArrowRight, X, Clock, Flame, Share2 } from 'lucide-react';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import { ShareQuizModal } from './ShareQuizModal';

interface SoloGameModalProps {
  quiz: Quiz;
  onClose: () => void;
  lang: Language;
}

export const SoloGameModal: React.FC<SoloGameModalProps> = ({
  quiz,
  onClose,
  lang
}) => {
  const t = translations[lang];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const currentQ = quiz.questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const correct = idx === currentQ.correctAnswer;
    if (correct) {
      soundManager.playCorrect();
      setScore(prev => prev + 1000);
      setStreak(prev => prev + 1);
    } else {
      soundManager.playWrong();
      setStreak(0);
    }
  };

  const handleNext = () => {
    soundManager.playClick();
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      soundManager.playVictory();
      setIsFinished(true);

      if (!historySaved) {
        setHistorySaved(true);
        saveGameHistoryRecord({
          id: `history-${Date.now()}`,
          quizTitle: quiz.title,
          category: quiz.category,
          score: score + (currentQ && selectedOption === currentQ.correctAnswer ? 1000 : 0),
          maxPossibleScore: quiz.questions.length * 1000,
          mode: 'Solo Practice',
          datePlayed: Date.now()
        });
      }
    }
  };

  const colors = [
    'bg-blue-600 hover:bg-blue-500 border-blue-400',
    'bg-indigo-600 hover:bg-indigo-500 border-indigo-400',
    'bg-sky-600 hover:bg-sky-500 border-sky-400',
    'bg-cyan-600 hover:bg-cyan-500 border-cyan-400'
  ];

  const shapes = ['▲', '◆', '●', '■'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-blue-900 border border-blue-700 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-800">
          <div>
            <h3 className="text-lg font-bold text-white">{quiz.title}</h3>
            <p className="text-xs text-blue-200">{t.soloPractice}</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="bg-yellow-400 text-blue-950 px-3 py-1 rounded-lg text-xs font-black shadow-sm">
              {score} pts
            </span>
            <button
              onClick={() => { soundManager.playClick(); onClose(); }}
              className="p-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isFinished ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-blue-200">
              <span>{lang === 'id' ? `Pertanyaan ${currentIndex + 1} dari ${quiz.questions.length}` : `Question ${currentIndex + 1} of ${quiz.questions.length}`}</span>
              {streak > 1 && (
                <span className="flex items-center space-x-1 text-yellow-300 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-yellow-400" />
                  <span>{streak} Streak</span>
                </span>
              )}
            </div>

            <div className="bg-blue-950 border border-blue-700 rounded-2xl p-6 text-center shadow-inner">
              <span className="text-3xl mb-2 block">{currentQ.image || '🎯'}</span>
              <h2 className="text-xl font-black text-white leading-snug">{currentQ.question}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctAnswer;
                let btnStyle = colors[idx % colors.length];

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-yellow-400 border-yellow-200 text-blue-950 ring-4 ring-yellow-400/30 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-600 border-rose-400 opacity-60 text-white';
                  } else {
                    btnStyle = 'bg-blue-950 border-blue-800 opacity-40 text-blue-300';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={isAnswered}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all text-left ${btnStyle}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-xl font-black ${isAnswered && isCorrect ? 'text-blue-950' : 'text-white/90'}`}>{shapes[idx % shapes.length]}</span>
                      <span className={`font-bold text-sm ${isAnswered && isCorrect ? 'text-blue-950' : 'text-white'}`}>{opt}</span>
                    </div>
                    {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-blue-950 flex-shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-white flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-yellow-400/30 transition-transform transform hover:-translate-y-0.5"
                >
                  <span>{currentIndex + 1 < quiz.questions.length ? t.nextQuestion : t.viewResults}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 space-y-6 animate-fade-in">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" />
            <div>
              <h2 className="text-2xl font-black text-white mb-1">{t.quizCompleted}</h2>
              <p className="text-blue-200 text-sm">{lang === 'id' ? 'Hasil latihan Anda telah disimpan ke riwayat.' : 'Your practice result has been saved to history.'}</p>
            </div>

            <div className="bg-blue-950 border border-blue-700 rounded-2xl p-6 max-w-xs mx-auto space-y-2">
              <span className="text-xs text-blue-300 uppercase tracking-widest block font-semibold">{t.finalScore}</span>
              <div className="text-4xl font-black text-yellow-400">{score} pts</div>
            </div>

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
                onClick={() => { soundManager.playClick(); onClose(); }}
                className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-lg shadow-yellow-400/30 transition-all transform hover:-translate-y-0.5"
              >
                {t.returnDashboard}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareQuizModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          quiz={quiz}
          lang={lang}
        />
      )}
    </div>
  );
};
