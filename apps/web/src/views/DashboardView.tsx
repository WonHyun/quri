import type { DashboardStats } from "../types";

export function DashboardView(props: {
  stats: DashboardStats | null;
  onHome: () => void;
}) {
  const { stats } = props;
  if (!stats) {
    return (
      <section className="card fade-in">
        <h2>대시보드</h2>
        <p className="muted">통계를 불러오는 중이거나 데이터가 없습니다.</p>
        <div className="actions">
          <button className="primary" onClick={props.onHome}>
            <span className="btn-i">🏠</span> 홈으로
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card fade-in">
      <h2>
        <span className="btn-i">📊</span> 내 학습 대시보드
      </h2>
      <p className="card-sub">내가 만든 퀴즈와 풀이 기록 요약이에요.</p>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-num">{stats.ownedQuizzes}</div>
          <div className="stat-label">만든 퀴즈</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.totalAttempts}</div>
          <div className="stat-label">총 시도</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.averageAccuracy}%</div>
          <div className="stat-label">평균 정답률</div>
        </div>
      </div>

      <h3 className="dash-h">최근 시도</h3>
      {stats.recentAttempts.length === 0 ? (
        <p className="muted">아직 풀이 기록이 없어요.</p>
      ) : (
        <ul className="history">
          {stats.recentAttempts.map((a) => (
            <li key={a.id}>
              <span className="h-body" style={{ padding: "10px 12px" }}>
                <span className="history-topic">{a.topic}</span>
                <span className="history-meta">
                  {a.score}/{a.total}점 ·{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="dash-h">주제별 정답률</h3>
      {stats.byTopic.length === 0 ? (
        <p className="muted">집계할 데이터가 없어요.</p>
      ) : (
        <ul className="topic-stats">
          {stats.byTopic.map((t) => (
            <li key={t.topic}>
              <div className="topic-stat-head">
                <span>{t.topic}</span>
                <span className="muted">
                  {t.accuracy}% · {t.attempts}회
                </span>
              </div>
              <div className="progress-bar">
                <span style={{ width: `${t.accuracy}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button className="primary" onClick={props.onHome}>
          <span className="btn-i">🏠</span> 홈으로
        </button>
      </div>
    </section>
  );
}
