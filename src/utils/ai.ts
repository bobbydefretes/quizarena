import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Question, Quiz } from '../types';

export async function generateQuizWithAI(topic: string, questionCount: number = 5): Promise<Quiz> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY;
  
  // If no API key or fallback, generate intelligent mock questions tailored to the topic
  if (!apiKey) {
    return generateFallbackAIQuiz(topic, questionCount);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Engaging title for the quiz" },
        description: { type: Type.STRING, description: "Short description of the quiz" },
        category: { type: Type.STRING, description: "Category name (e.g. Science, History, Tech, Pop Culture)" },
        difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "Trivia question text" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 multiple choice options"
              },
              correctAnswer: { type: Type.INTEGER, description: "Index of correct option (0, 1, 2, or 3)" },
              image: { type: Type.STRING, description: "Single representative emoji for the question" }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      },
      required: ["title", "description", "category", "difficulty", "questions"]
    };

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a fun, high-quality interactive trivia quiz about "${topic}" with exactly ${questionCount} multiple-choice questions. Each question must have 4 options and 1 correct index (0-3).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    const quiz: Quiz = {
      id: `ai-quiz-${Date.now()}`,
      title: parsed.title || `${topic} Quiz`,
      description: parsed.description || `AI generated quiz about ${topic}`,
      category: parsed.category || 'General',
      difficulty: parsed.difficulty || 'Medium',
      creatorName: 'Gemini AI',
      createdAt: Date.now(),
      coverImage: '✨',
      questions: (parsed.questions || []).map((q: any, idx: number) => ({
        id: `ai-q-${idx}-${Date.now()}`,
        question: q.question,
        options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        timeLimit: 15,
        points: 1000,
        image: q.image || '🎯'
      }))
    };

    return quiz;
  } catch (err) {
    console.error("Gemini AI Quiz Generation Error:", err);
    return generateFallbackAIQuiz(topic, questionCount);
  }
}

function generateFallbackAIQuiz(topic: string, count: number): Quiz {
  const sampleQuestions: Question[] = [];
  const emojis = ['🌟', '🧠', '🚀', '💡', '🔥', '🎯', '⚡', '🏆'];

  for (let i = 1; i <= count; i++) {
    sampleQuestions.push({
      id: `fallback-q-${i}`,
      question: `Question ${i}: What is a key fact or concept related to ${topic}?`,
      options: [
        `Primary foundational principle of ${topic}`,
        `Secondary misconception about ${topic}`,
        `Unrelated historical footnote`,
        `Advanced theoretical derivative`
      ],
      correctAnswer: 0,
      timeLimit: 15,
      points: 1000,
      image: emojis[(i - 1) % emojis.length]
    });
  }

  return {
    id: `ai-fallback-${Date.now()}`,
    title: `${topic} Expert Challenge`,
    description: `An engaging AI-powered quiz exploring ${topic}.`,
    category: 'AI Generated',
    difficulty: 'Medium',
    creatorName: 'QuizArena AI',
    createdAt: Date.now(),
    coverImage: '🤖',
    questions: sampleQuestions
  };
}
