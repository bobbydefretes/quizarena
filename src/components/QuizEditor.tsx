import React, { useState, useRef } from 'react';
import { Quiz, Question } from '../types';
import { Plus, Trash2, Save, ArrowLeft, Sparkles, CheckCircle2, FileSpreadsheet, Download, Upload } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { Language, translations } from '../utils/i18n';
import * as XLSX from 'xlsx';

interface QuizEditorProps {
  initialQuiz?: Quiz | null;
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
  onOpenAIModal: () => void;
  lang: Language;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  initialQuiz,
  onSave,
  onCancel,
  onOpenAIModal,
  lang
}) => {
  const t = translations[lang];
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [category, setCategory] = useState(initialQuiz?.category || 'General');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(initialQuiz?.difficulty || 'Medium');
  const [coverImage, setCoverImage] = useState(initialQuiz?.coverImage || '🎯');
  const [questions, setQuestions] = useState<Question[]>(
    initialQuiz?.questions || [
      {
        id: `q-${Date.now()}-1`,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 15,
        points: 1000,
        image: '💡'
      }
    ]
  );
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    soundManager.playClick();
    setQuestions([
      ...questions,
      {
        id: `q-${Date.now()}-${questions.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 15,
        points: 1000,
        image: '⭐'
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError(lang === 'id' ? 'Kuis harus memiliki setidaknya satu pertanyaan.' : 'Quiz must have at least one question.');
      return;
    }
    soundManager.playClick();
    setError('');
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question = text;
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const setCorrectAnswer = (qIndex: number, optIndex: number) => {
    soundManager.playClick();
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const downloadExcelTemplate = () => {
    soundManager.playClick();
    const templateData = [
      {
        "Question": "What is the capital of France?",
        "Option 1": "London",
        "Option 2": "Berlin",
        "Option 3": "Paris",
        "Option 4": "Madrid",
        "Correct Answer (1-4)": 3,
        "Time Limit (s)": 15,
        "Emoji": "🌍"
      },
      {
        "Question": "Which programming language is used for React?",
        "Option 1": "Python",
        "Option 2": "JavaScript",
        "Option 3": "C++",
        "Option 4": "Java",
        "Correct Answer (1-4)": 2,
        "Time Limit (s)": 15,
        "Emoji": "💻"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Template");
    XLSX.writeFile(workbook, "QuizArena_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundManager.playClick();
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!data || data.length === 0) {
          setError(lang === 'id' ? 'File kosong atau tidak valid.' : 'Uploaded file is empty or invalid.');
          return;
        }

        const importedQuestions: Question[] = data.map((row, idx) => {
          const questionText = row["Question"] || row["question"] || `Question ${idx + 1}`;
          const opt1 = row["Option 1"] || row["option_1"] || "";
          const opt2 = row["Option 2"] || row["option_2"] || "";
          const opt3 = row["Option 3"] || row["option_3"] || "";
          const opt4 = row["Option 4"] || row["option_4"] || "";
          const correctNum = Number(row["Correct Answer (1-4)"] || row["correct_answer"] || 1);
          const timeLimit = Number(row["Time Limit (s)"] || row["time_limit"] || 15);
          const emoji = row["Emoji"] || row["emoji"] || "🎯";

          let correctIndex = Math.max(0, Math.min(3, correctNum - 1));

          return {
            id: `imported-${Date.now()}-${idx}`,
            question: String(questionText),
            options: [String(opt1), String(opt2), String(opt3), String(opt4)],
            correctAnswer: correctIndex,
            timeLimit: isNaN(timeLimit) ? 15 : timeLimit,
            points: 1000,
            image: String(emoji)
          };
        });

        setQuestions(importedQuestions);
        setError('');
        soundManager.playCorrect();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error(err);
        setError(lang === 'id' ? 'Gagal memparsing file Excel/CSV.' : 'Failed to parse Excel/CSV file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(lang === 'id' ? 'Harap masukkan judul kuis.' : 'Please enter a quiz title.');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setError(lang === 'id' ? `Pertanyaan ${i + 1} tidak boleh kosong.` : `Question ${i + 1} text cannot be empty.`);
        return;
      }
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          setError(lang === 'id' ? `Pertanyaan ${i + 1}, Opsi ${j + 1} tidak boleh kosong.` : `Question ${i + 1}, Option ${j + 1} cannot be empty.`);
          return;
        }
      }
    }

    soundManager.playCorrect();
    const quiz: Quiz = {
      id: initialQuiz?.id || `quiz-${Date.now()}`,
      title,
      description,
      category,
      difficulty,
      creatorName: initialQuiz?.creatorName || 'You',
      createdAt: initialQuiz?.createdAt || Date.now(),
      coverImage,
      questions
    };

    onSave(quiz);
  };

  const emojis = ['🎯', '🤖', '🚀', '🧠', '💡', '🔥', '⚡', '🏆', '🍿', '🌍', '💻', '⭐', '🎨', '📚'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { soundManager.playClick(); onCancel(); }}
          className="flex items-center space-x-2 text-blue-200 hover:text-white transition-colors text-sm font-semibold bg-blue-900 px-4 py-2 rounded-xl border border-blue-700 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToQuizzes}</span>
        </button>

        <button
          onClick={() => { soundManager.playClick(); onOpenAIModal(); }}
          className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-yellow-400/30"
        >
          <Sparkles className="w-4 h-4 text-blue-950 animate-pulse" />
          <span>{t.aiGenerator}</span>
        </button>
      </div>

      <div className="bg-blue-900/90 border border-blue-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-6 border-b border-blue-800 gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {initialQuiz ? t.editQuiz : t.createNewQuiz}
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-1">
              {t.editorSubtitle}
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-100 text-xs font-bold border border-blue-700 flex items-center space-x-1.5 transition-all shadow-sm"
              title="Download Excel Template"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t.downloadTemplate}</span>
            </button>

            <label className="px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-100 text-xs font-bold border border-blue-700 flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5 text-yellow-400" />
              <span>{t.importXlsx}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.quizTitle}</label>
              <input
                type="text"
                placeholder={t.quizTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 transition-all text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.description}</label>
              <textarea
                rows={2}
                placeholder={t.descPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 transition-all text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.category}</label>
              <input
                type="text"
                placeholder={t.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.difficulty}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-all text-sm"
              >
                <option value="Easy">{t.easy}</option>
                <option value="Medium">{t.medium}</option>
                <option value="Hard">{t.hard}</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.coverEmoji}</label>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-700 flex items-center justify-center text-2xl shadow-inner">
                  {coverImage}
                </div>
                <div className="flex flex-wrap gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { soundManager.playClick(); setCoverImage(emoji); }}
                      className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                        coverImage === emoji ? 'bg-yellow-400 text-blue-950 font-bold scale-110 shadow-md' : 'bg-blue-950 hover:bg-blue-800 border border-blue-700 text-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-blue-800" />

          {/* Questions Builder */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{lang === 'id' ? `Pertanyaan Kuis (${questions.length})` : `Quiz Questions (${questions.length})`}</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 text-xs font-black flex items-center space-x-2 transition-all shadow-md shadow-yellow-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addQuestion}</span>
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-blue-950 border border-blue-700/80 rounded-2xl p-6 relative space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-blue-900 border border-blue-700 text-yellow-300 text-xs font-bold">
                    {lang === 'id' ? `Pertanyaan #${qIndex + 1}` : `Question #${qIndex + 1}`}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="p-2 rounded-lg bg-blue-900 hover:bg-rose-900/60 text-blue-300 hover:text-rose-200 transition-colors"
                      title="Remove Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-1.5">{t.questionPrompt}</label>
                  <input
                    type="text"
                    placeholder="e.g. What is the output of typeof null in JavaScript?"
                    value={q.question}
                    onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                    className="w-full bg-blue-900 border border-blue-700 rounded-xl px-4 py-2.5 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-200 mb-2">
                    {t.optionsLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all ${
                          q.correctAnswer === optIndex
                            ? 'bg-blue-900 border-yellow-400 ring-1 ring-yellow-400 shadow-inner'
                            : 'bg-blue-900/60 border-blue-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctAnswer === optIndex}
                          onChange={() => setCorrectAnswer(qIndex, optIndex)}
                          className="w-4 h-4 text-yellow-400 focus:ring-yellow-400 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${optIndex + 1}`}
                          value={opt}
                          onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                          className="w-full bg-transparent text-white placeholder-blue-400 focus:outline-none text-sm"
                        />
                        {q.correctAnswer === optIndex && (
                          <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-300 font-medium">{t.timeLimit}</span>
                    <div className="flex items-center space-x-1.5">
                      {[5, 10, 15, 30].map((tVal) => (
                        <button
                          key={tVal}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            const updated = [...questions];
                            updated[qIndex].timeLimit = tVal;
                            setQuestions(updated);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            q.timeLimit === tVal
                              ? 'bg-yellow-400 text-blue-950 shadow-sm'
                              : 'bg-blue-900 text-blue-200 hover:bg-blue-800 border border-blue-700'
                          }`}
                        >
                          {tVal}s
                        </button>
                      ))}
                      <div className="flex items-center space-x-1 ml-1">
                        <input
                          type="number"
                          min={3}
                          max={300}
                          value={q.timeLimit}
                          onChange={(e) => {
                            const val = Math.max(3, Number(e.target.value) || 15);
                            const updated = [...questions];
                            updated[qIndex].timeLimit = val;
                            setQuestions(updated);
                          }}
                          className="w-16 bg-blue-900 border border-blue-700 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-yellow-400"
                          title="Custom seconds"
                        />
                        <span className="text-xs text-blue-300">sec</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-blue-800">
            <button
              type="button"
              onClick={() => { soundManager.playClick(); onCancel(); }}
              className="px-6 py-3 rounded-xl bg-blue-950 hover:bg-blue-800 text-blue-200 font-bold text-sm transition-colors border border-blue-700"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-xl shadow-yellow-400/30 flex items-center space-x-2 transition-transform transform hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveQuiz}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
