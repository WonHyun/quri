import { useEffect, useState } from "react";
import {
  getDashboard,
  getQuiz,
  listPresets,
  listQuizzes,
  submitQuiz,
  UnauthorizedError,
} from "./api";
import type {
  DashboardStats,
  Difficulty,
  ExamPreset,
  Quiz,
  QuizJob,
  QuizSummary,
  SubmitResult,
} from "./types";
import { QuriLogo } from "./brand/Logo";
import { RANDOM_TOPICS } from "./constants";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { useQuizJobs } from "./hooks/useQuizJobs";
import { AuthView } from "./views/AuthView";
import { HomeView } from "./views/HomeView";
import { TakingView } from "./views/TakingView";
import { ResultsView } from "./views/ResultsView";
import { DashboardView } from "./views/DashboardView";
import { JobsPanel } from "./views/JobsPanel";

type View = "home" | "taking" | "results" | "dashboard";

export default function App() {
  const { isDark, toggle } = useTheme();
  const { user, ready, onAuthed, logout } = useAuth();

  const [view, setView] = useState<View>("home");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [choiceCount, setChoiceCount] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [presets, setPresets] = useState<ExamPreset[]>([]);
  const [presetSlug, setPresetSlug] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const [history, setHistory] = useState<QuizSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const jobsApi = useQuizJobs({
    enabled: !!user,
    onReady: () => void refreshHistory(),
    onUnauthorized: logout,
  });

  useEffect(() => {
    if (user) void refreshHistory();
    else {
      setHistory([]);
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    listPresets()
      .then(setPresets)
      .catch(() => {
        /* 프리셋은 보조 기능 — 실패해도 자유주제 흐름은 동작 */
      });
  }, []);

  const activePreset = presets.find((p) => p.slug === presetSlug) ?? null;

  /** 프리셋 선택/해제 — 선택 시 주제칸을 기본값으로 채운다. */
  function selectPreset(slug: string) {
    if (presetSlug === slug) {
      setPresetSlug(null);
      setSubject(null);
      return;
    }
    const p = presets.find((x) => x.slug === slug);
    setPresetSlug(slug);
    setSubject(null);
    if (p) {
      setTopic(p.defaultTopic);
      setCount(p.defaultCount);
      setChoiceCount(p.defaultChoiceCount);
      setDifficulty(p.defaultDifficulty);
    }
  }

  /** 자유주제를 직접 수정하면 프리셋 선택을 해제한다. */
  function editTopic(v: string) {
    setTopic(v);
    if (presetSlug) {
      setPresetSlug(null);
      setSubject(null);
    }
  }

  function randomizeTopic() {
    const t = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setPresetSlug(null);
    setSubject(null);
    setTopic(t);
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("주제를 입력해 주세요.");
      return;
    }
    setError(null);
    try {
      const job = await jobsApi.enqueue({
        topic: topic.trim(),
        count,
        choiceCount,
        difficulty,
        presetSlug: presetSlug ?? undefined,
        subject: subject ?? undefined,
      });
      setNotice(
        `‘${job.topic}’ ${job.count}문항을 생성하고 있어요. 완료되면 ‘생성 작업’과 ‘내 퀴즈’에 표시됩니다. 기다리는 동안 다른 퀴즈를 풀어도 돼요.`,
      );
    } catch (e) {
      setError(guard(e));
    }
  }

  /** 완료된 생성 작업을 열어 바로 풀이를 시작한다. */
  async function handleOpenJob(job: QuizJob) {
    if (!job.quizId) return;
    await handleOpenHistory(job.quizId);
    void jobsApi.dismiss(job.id);
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
    setNotice(null);
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
            {user.isGuest ? "게스트" : user.displayName || user.email}
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
            자격증 시험,
            <br />
            <span className="grad">퀴즈로 정복</span>하세요
          </h1>
          <p>
            SQLD·정보처리기사·정보보안기사·한국사 등 시험을 고르면 Quri가 출제
            경향에 맞춘 4지선다 문제를 만들고, 풀이·채점·해설까지 한 번에.
            원하는 주제를 직접 입력할 수도 있어요.
          </p>
        </div>
      )}

      <div className="layout">
        <main className="main">
          {user.isGuest && (
            <div className="banner guest-banner" role="status">
              <span>👋</span>
              <span>
                게스트 모드예요. 만든 퀴즈와 기록은 임시로 보관되며 일정 기간 뒤
                삭제될 수 있어요. 계정을 만들면 안전하게 이어갈 수 있어요.
              </span>
              <button
                className="banner-cta"
                onClick={logout}
                type="button"
              >
                회원가입
              </button>
            </div>
          )}
          {error && (
            <div className="banner error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="banner info" role="status">
              <span>⏳</span>
              <span>{notice}</span>
              <button
                className="banner-close"
                onClick={() => setNotice(null)}
                aria-label="알림 닫기"
                type="button"
              >
                ✕
              </button>
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
              setTopic={editTopic}
              count={count}
              setCount={setCount}
              choiceCount={choiceCount}
              setChoiceCount={setChoiceCount}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              presets={presets}
              presetSlug={presetSlug}
              onSelectPreset={selectPreset}
              subjects={activePreset?.subjects ?? []}
              subject={subject}
              setSubject={setSubject}
              onRandom={randomizeTopic}
              onGenerate={handleGenerate}
              disabled={jobsApi.creating}
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
          <JobsPanel
            jobs={jobsApi.jobs}
            onOpen={handleOpenJob}
            onDismiss={(id) => void jobsApi.dismiss(id)}
          />
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
