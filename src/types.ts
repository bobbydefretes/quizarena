export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0 to 3
  timeLimit: number; // seconds, e.g. 15 or 30
  points: number; // e.g. 1000
  image?: string; // optional emoji or image URL
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  creatorName: string;
  createdAt: number;
  questions: Question[];
  coverImage?: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  answers: { [questionIndex: number]: { answer: number; correct: boolean; timeTaken: number; pointsEarned: number } };
}

export type GameState = 'lobby' | 'question_countdown' | 'question_active' | 'question_reveal' | 'podium' | 'game_over';

export interface GameSession {
  pin: string;
  quizId: string;
  quiz: Quiz;
  hostId: string;
  state: GameState;
  currentQuestionIndex: number;
  timeRemaining: number;
  players: Player[];
  isActive: boolean;
}

export interface GameHistoryRecord {
  id: string;
  quizTitle: string;
  category: string;
  score: number;
  maxPossibleScore: number;
  mode: 'Solo Practice' | 'Live Multiplayer';
  datePlayed: number;
}
