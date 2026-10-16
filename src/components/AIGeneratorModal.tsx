import React, { useState } from 'react';
import { Quiz } from '../types';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { generateQuizWithAI } from '../utils/ai';
import { soundManager } from '../utils/sound';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (quiz: Quiz) => void;
  lang?: string;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onQuizGenerated,
  lang = 'id'
}) => {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    soundManager.playClick();
    setLoading(true);
    try {
      const newQuiz = await generateQuizWithAI(topic.trim(), questionCount);
      soundManager.playCorrect();
      onQuizGenerated(newQuiz);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'JavaScript & Web APIs',
    'Space Exploration',
    'World History & Wonders',
    'Artificial Intelligence',
    'Pop Culture & Cinema',
    'Global Geography'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-blue-900 border border-yellow-400/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/30 text-blue-950">
              <Sparkles className="w-5 h-5 text-blue-950" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">AI Quiz Generator</h3>
              <p className="text-xs text-blue-200">Powered by Gemini AI</p>
            </div>
          </div>

          <button
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="p-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
              What topic would you like a quiz on? *
            </label>
            <input
              type="text"
              placeholder="e.g. Ancient Roman History, ReactJS Hooks, Quantum Physics..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 text-sm shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
              Number of Questions ({questionCount})
            </label>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              disabled={loading}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>3 questions</span>
              <span>10 questions</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-blue-200 mb-2">Popular Suggestions:</span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => { soundManager.playClick(); setTopic(sug); }}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-800 border border-blue-700 text-xs text-blue-100 transition-all font-medium"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-blue-800">
            <button
              type="button"
              onClick={() => { soundManager.playClick(); onClose(); }}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 text-xs font-bold transition-colors border border-blue-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-blue-950 text-xs font-black shadow-lg shadow-yellow-400/30 flex items-center space-x-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-950" />
                  <span>Generating AI Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-950" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
