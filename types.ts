export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For Multiple Choice
  correctAnswer: string; // Stored as string for all types
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timerSeconds?: number;
  maxQuestionsToShow?: number;
  startTime?: string; // ISO string
  endTime?: string;   // ISO string
  isVisible?: boolean;
  requireSection?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  type: 'CHOICE' | 'TEXT';
  options?: string[]; // For CHOICE type
  isVisible: boolean;
  timestamp: number;
}

export interface PollResponse {
  id?: string;
  pollId: string;
  studentName: string;
  response: string; // Choice text or open-ended text
  timestamp: number;
}

export interface AppSettings {
  geminiApiKey: string;
}

export interface StudentInfo {
  name: string;
  section: string;
}

export interface UserAnswer {
  questionId: string;
  questionText: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizResult {
  id?: string;
  quizId: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  answers: UserAnswer[];
  studentInfo?: StudentInfo;
  timestamp?: number;
}
