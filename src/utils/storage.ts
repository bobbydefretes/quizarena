import { Quiz, GameSession, GameHistoryRecord } from '../types';

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'quiz-tech-ai',
    title: 'Artificial Intelligence & Tech Trivia',
    description: 'Test your knowledge on modern AI models, tech history, and computer science milestones!',
    category: 'Technology',
    difficulty: 'Medium',
    creatorName: 'QuizArena Team',
    createdAt: Date.now() - 86400000 * 3,
    coverImage: '🤖',
    questions: [
      {
        id: 'q1',
        question: 'Which company developed the Gemini family of multimodal AI models?',
        options: ['OpenAI', 'Google', 'Anthropic', 'Meta'],
        correctAnswer: 1,
        timeLimit: 15,
        points: 1000,
        image: '🧠'
      },
      {
        id: 'q2',
        question: 'What does API stand for in software development?',
        options: [
          'Advanced Program Integration',
          'Application Programming Interface',
          'Automated Protocol Interaction',
          'Application Process Integration'
        ],
        correctAnswer: 1,
        timeLimit: 15,
        points: 1000,
        image: '💻'
      },
      {
        id: 'q3',
        question: 'In what year was World Wide Web (WWW) invented by Tim Berners-Lee?',
        options: ['1983', '1989', '1995', '1991'],
        correctAnswer: 1,
        timeLimit: 20,
        points: 1000,
        image: '🌐'
      },
      {
        id: 'q4',
        question: 'Which programming language is known as the primary language for machine learning and data science?',
        options: ['C++', 'Java', 'Python', 'Rust'],
        correctAnswer: 2,
        timeLimit: 15,
        points: 1000,
        image: '🐍'
      }
    ]
  },
  {
    id: 'quiz-space-science',
    title: 'Space Exploration & Astronomy',
    description: 'Journey across the cosmos, planets, stars, and space missions!',
    category: 'Science',
    difficulty: 'Hard',
    creatorName: 'AstroGeek',
    createdAt: Date.now() - 86400000 * 5,
    coverImage: '🚀',
    questions: [
      {
        id: 'sq1',
        question: 'Which planet in our solar system has the most prominent ring system?',
        options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
        correctAnswer: 1,
        timeLimit: 15,
        points: 1000,
        image: '🪐'
      },
      {
        id: 'sq2',
        question: 'What is the closest star to Earth outside of our solar system?',
        options: ['Sirius', 'Proxima Centauri', 'Betelgeuse', 'Alpha Centauri A'],
        correctAnswer: 1,
        timeLimit: 20,
        points: 1000,
        image: '⭐'
      },
      {
        id: 'sq3',
        question: 'What space telescope was launched on Christmas Day in 2021 as the successor to Hubble?',
        options: ['Kepler Space Telescope', 'James Webb Space Telescope', 'Chandra X-ray Observatory', 'Spitzer Space Telescope'],
        correctAnswer: 1,
        timeLimit: 15,
        points: 1000,
        image: '🔭'
      }
    ]
  },
  {
    id: 'quiz-pop-culture',
    title: 'Pop Culture & Movies Masterclass',
    description: 'How well do you know iconic cinematic moments, series, and pop culture?',
    category: 'Entertainment',
    difficulty: 'Easy',
    creatorName: 'CinemaFan',
    createdAt: Date.now() - 86400000 * 2,
    coverImage: '🍿',
    questions: [
      {
        id: 'pq1',
        question: 'Which wizarding school does Harry Potter attend?',
        options: ['Beauxbatons', 'Durmstrang', 'Hogwarts', 'Ilvermorny'],
        correctAnswer: 2,
        timeLimit: 15,
        points: 1000,
        image: '⚡'
      },
      {
        id: 'pq2',
        question: 'Who directed the epic science fiction film "Interstellar" (2014)?',
        options: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Denis Villeneuve'],
        correctAnswer: 1,
        timeLimit: 15,
        points: 1000,
        image: '🌌'
      },
      {
        id: 'pq3',
        question: 'What is the fictional metal native to Wakanda in the Marvel Universe?',
        options: ['Adamantium', 'Mithril', 'Vibranium', 'Uru'],
        correctAnswer: 2,
        timeLimit: 15,
        points: 1000,
        image: '🛡️'
      }
    ]
  }
];

const STORAGE_KEY_QUIZZES = 'quizarena_custom_quizzes_v1';
const STORAGE_KEY_SESSIONS = 'quizarena_active_sessions_v1';
const STORAGE_KEY_HISTORY = 'quizarena_game_history_v1';

export function getStoredQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUIZZES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(DEFAULT_QUIZZES));
      return DEFAULT_QUIZZES;
    }
    const custom = JSON.parse(raw) as Quiz[];
    return custom;
  } catch {
    return DEFAULT_QUIZZES;
  }
}

export function saveQuiz(quiz: Quiz) {
  const quizzes = getStoredQuizzes();
  const existingIdx = quizzes.findIndex(q => q.id === quiz.id);
  if (existingIdx >= 0) {
    quizzes[existingIdx] = quiz;
  } else {
    quizzes.unshift(quiz);
  }
  localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(quizzes));
}

export function deleteQuiz(quizId: string) {
  const quizzes = getStoredQuizzes().filter(q => q.id !== quizId);
  localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(quizzes));
}

export function getActiveSession(pin: string): GameSession | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_SESSIONS}_${pin}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveActiveSession(session: GameSession) {
  try {
    localStorage.setItem(`${STORAGE_KEY_SESSIONS}_${session.pin}`, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session', e);
  }
}

export function removeActiveSession(pin: string) {
  localStorage.removeItem(`${STORAGE_KEY_SESSIONS}_${pin}`);
}

export function getGameHistory(): GameHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveGameHistoryRecord(record: GameHistoryRecord) {
  try {
    const history = getGameHistory();
    history.unshift(record);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history record', e);
  }
}
