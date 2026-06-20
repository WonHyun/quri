import type {
  AuthResponse,
  AuthUser,
  DashboardStats,
  Difficulty,
  Quiz,
  QuizSummary,
  SubmitResult,
} from "./types";

const TOKEN_KEY = "quri-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 인증 만료/누락 시 던지는 에러 — 호출부에서 로그아웃 처리에 사용. */
export class UnauthorizedError extends Error {
  constructor(message = "인증이 필요합니다.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function authHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ── 인증 ──────────────────────────────────────────────────────────────

export interface SignupRequestResult {
  email: string;
  expiresInSeconds: number;
}

export async function signup(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<SignupRequestResult> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<SignupRequestResult>(res);
}

export async function verifySignup(input: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  const res = await fetch("/api/auth/signup/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<AuthResponse>(res);
}

export async function resendCode(input: {
  email: string;
}): Promise<SignupRequestResult> {
  const res = await fetch("/api/auth/signup/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<SignupRequestResult>(res);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<AuthResponse>(res);
}

export async function me(): Promise<AuthUser> {
  return handle<AuthUser>(
    await fetch("/api/auth/me", { headers: authHeaders() }),
  );
}

// ── 퀴즈 ──────────────────────────────────────────────────────────────

export async function createQuiz(input: {
  topic: string;
  count: number;
  choiceCount: number;
  difficulty: Difficulty;
}): Promise<Quiz> {
  const res = await fetch("/api/quizzes", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  return handle<Quiz>(res);
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  return handle<QuizSummary[]>(
    await fetch("/api/quizzes", { headers: authHeaders() }),
  );
}

export async function getQuiz(id: string): Promise<Quiz> {
  return handle<Quiz>(
    await fetch(`/api/quizzes/${id}`, { headers: authHeaders() }),
  );
}

export async function submitQuiz(
  id: string,
  answers: { questionId: string; selectedIndex: number }[],
): Promise<SubmitResult> {
  const res = await fetch(`/api/quizzes/${id}/submit`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ answers }),
  });
  return handle<SubmitResult>(res);
}

// ── 대시보드 ──────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardStats> {
  return handle<DashboardStats>(
    await fetch("/api/dashboard/stats", { headers: authHeaders() }),
  );
}
