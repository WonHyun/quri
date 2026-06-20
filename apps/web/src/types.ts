export interface PublicQuestion {
  id: string;
  text: string;
  options: string[];
  order: number;
}

export interface Quiz {
  id: string;
  topic: string;
  createdAt: string;
  questions: PublicQuestion[];
}

export type Visibility = "PRIVATE" | "PUBLIC";

export interface QuizSummary {
  id: string;
  topic: string;
  difficulty: Difficulty | null;
  visibility: Visibility;
  createdAt: string;
  questionCount: number;
}

export interface QuestionResult {
  questionId: string;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface SubmitResult {
  quizId: string;
  total: number;
  score: number;
  results: QuestionResult[];
}

export type Difficulty = "easy" | "medium" | "hard";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AttemptSummary {
  id: string;
  quizId: string;
  topic: string;
  score: number;
  total: number;
  createdAt: string;
}

export interface TopicStat {
  topic: string;
  attempts: number;
  accuracy: number;
}

export interface DashboardStats {
  ownedQuizzes: number;
  totalAttempts: number;
  averageAccuracy: number;
  recentAttempts: AttemptSummary[];
  byTopic: TopicStat[];
}
