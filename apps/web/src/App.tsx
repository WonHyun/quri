import { useEffect, useState } from "react";
import {
  createQuiz,
  getDashboard,
  getQuiz,
  listQuizzes,
  submitQuiz,
  UnauthorizedError,
} from "./api";
import type {
  DashboardStats,
  Difficulty,
  Quiz,
  QuizSummary,
  SubmitResult,
} from "./types";
import { QuriLogo } from "./brand/Logo";
import { RANDOM_TOPICS } from "./constants";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { AuthView } from "./views/AuthView";
import { HomeView } from "./views/HomeView";
import { TakingView } from "./views/TakingView";
import { ResultsView } from "./views/ResultsView";
import { DashboardView } from "./views/DashboardView";

type View = "home" | "taking" | "results" | "dashboard";

export default function App() {
  const { isDark, toggle } = useTheme();
  const { user, ready, onAuthed, logout } = useAuth();

  const [view, setView] = useState<View>("home");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [choiceCount, setChoiceCount] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const [history, setHistory] = useState<QuizSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 인증 만료 시 자동 로그아웃 처리. */
  function guard(e: unknown): string {
    if (e instanceof UnauthorizedError) {
      logout();
      return "세션이 만료되었습니다. 다시 로그인해 주세요.";
    }
    return (e as Error).message;
  }

  async function refreshHistory() {
    try {
      setHistory(await listQuizzes());
    } catch (e) {
      if (e instanceof UnauthorizedError) logout();
    }
  }

  useEffect(() => {
    if (user) void refreshHistory();
    else {
      setHistory([]);
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function randomizeTopic() {
    const t = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setTopic(t);
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("주제를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = await createQuiz({
        topic: topic.trim(),
        count,
        choiceCount,
        difficulty,
      });
      setQuiz(q);
      setAnswers({});
      setResult(null);
      setView("taking");
      void refreshHistory();
    } catch (e) {
      setError(guard(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenHistory(id: string) {
    setLoading(true);
    setError(null);
    try {
      const q = await getQuiz(id);
      setQuiz(q);
      setAnswers({});
      setResult(null);
      setView("taking");
    } catch (e) {
      setError(guard(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!quiz) return;
    setLoading(true);
    setError(null);
    try {
      const payload = Object.entries(answers).map(
        ([questionId, selectedIndex]) => ({
          questionId,
          selectedIndex,
        }),
      );
      const r = await submitQuiz(quiz.id, payload);
      setResult(r);
      setView("results");
    } catch (e) {
      setError(guard(e));
    } finally {
      setLoading(false);
    }
  }

  async function openDashboard() {
    setView("dashboard");
    setError(null);
    setLoading(true);
    try {
      setStats(await getDashboard());
    } catch (e) {
      setError(guard(e));
    } finally {
      setLoading(false);
    }
  }

  function goHome() {
    setView("home");
    setQuiz(null);
    setResult(null);
    setError(null);
  }

  if (!ready) {
    return (
      <div className="app">
        <div className="banner loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>불러오는 중…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <div className="topbar">
          <span className="brand-btn">
            <QuriLogo />
          </span>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={toggle}
              aria-label="테마 전환"
              title={isDark ? "라이트 모드" : "다크 모드"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        <AuthView onAuthed={onAuthed} />
        <footer className="footer">
          <span className="logo-word">Quri</span> — 궁금한 모든 주제를, 퀴즈로.
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="brand-btn" onClick={goHome} aria-label="Quri 홈">
          <QuriLogo />
        </button>
        <div className="topbar-actions">
          <button className="ghost" onClick={openDashboard}>
            <span className="btn-i">📊</span> 대시보드
          </button>
          <span className="user-chip" title={user.email}>
            {user.displayName || user.email}
          </span>
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label="테마 전환"
            title={isDark ? "라이트 모드" : "다크 모드"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button className="ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </div>

      {view === "home" && (
        <div className="hero fade-in">
          <span className="eyebrow">
            <span className="btn-i">✨</span> AI 학습 퀴즈
          </span>
          <h1>
            궁금한 모든 주제를,
            <br />
            <span className="grad">퀴즈로 정복</span>하세요
          </h1>
          <p>
            주제만 입력하면 Quri가 4지선다 문제를 만들고, 풀이·채점·해설까지
            한 번에. 만든 퀴즈는 내 계정에 저장돼 언제든 다시 도전할 수 있어요.
          </p>
        </div>
      )}

      <div className="layout">
        <main className="main">
          {error && (
            <div className="banner error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {loading && (
            <div className="banner loading" role="status">
              <span className="spinner" aria-hidden="true" />
              <span>처리 중입니다… 문제 생성은 수십 초 걸릴 수 있어요.</span>
            </div>
          )}

          {view === "home" && (
            <HomeView
              topic={topic}
              setTopic={setTopic}
              count={count}
              setCount={setCount}
              choiceCount={choiceCount}
              setChoiceCount={setChoiceCount}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              onRandom={randomizeTopic}
              onGenerate={handleGenerate}
              disabled={loading}
            />
          )}

          {view === "taking" && quiz && (
            <TakingView
              quiz={quiz}
              answers={answers}
              setAnswers={setAnswers}
              onSubmit={handleSubmit}
              disabled={loading}
            />
          )}

          {view === "results" && result && quiz && (
            <ResultsView
              quiz={quiz}
              result={result}
              onRetry={() => {
                setAnswers({});
                setResult(null);
                setView("taking");
              }}
              onHome={goHome}
            />
          )}

          {view === "dashboard" && (
            <DashboardView stats={stats} onHome={goHome} />
          )}
        </main>

        <aside className="sidebar">
          <h2>
            <span className="btn-i">📚</span> 내 퀴즈
          </h2>
          {history.length === 0 ? (
            <div className="empty">
              <div className="emoji">🗂️</div>
              <p className="muted">아직 만든 퀴즈가 없어요.</p>
            </div>
          ) : (
            <ul className="history">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => handleOpenHistory(h.id)}
                    disabled={loading}
                  >
                    <span className="h-body">
                      <span className="history-topic">{h.topic}</span>
                      <span className="history-meta">
                        {h.questionCount}문항 ·{" "}
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="h-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <footer className="footer">
        <span className="logo-word">Quri</span> — 궁금한 모든 주제를, 퀴즈로.
      </footer>
    </div>
  );
}
