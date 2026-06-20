import type { QuizJob } from "../types";

const STATUS_LABEL: Record<QuizJob["status"], string> = {
  pending: "대기 중",
  running: "생성 중",
  ready: "완료",
  failed: "실패",
};

/**
 * 진행 중/완료/실패한 퀴즈 생성 작업 목록.
 * 생성이 오래 걸려도 화면을 막지 않고, 완료되면 바로 풀 수 있게 한다.
 */
export function JobsPanel(props: {
  jobs: QuizJob[];
  onOpen: (job: QuizJob) => void;
  onDismiss: (id: string) => void;
}) {
  if (props.jobs.length === 0) return null;

  return (
    <section className="jobs-panel" aria-label="퀴즈 생성 작업">
      <h2>
        <span className="btn-i">⚙️</span> 생성 작업
      </h2>
      <ul className="jobs">
        {props.jobs.map((job) => {
          const active = job.status === "pending" || job.status === "running";
          return (
            <li key={job.id} className={`job is-${job.status}`}>
              <div className="job-body">
                <span className="job-topic">{job.topic}</span>
                <span className="job-meta">
                  {active && <span className="spinner" aria-hidden="true" />}
                  <span className={`job-status ${job.status}`}>
                    {STATUS_LABEL[job.status]}
                  </span>
                  <span className="job-count">· {job.count}문항</span>
                </span>
                {job.status === "failed" && job.error && (
                  <span className="job-error" title={job.error}>
                    {job.error}
                  </span>
                )}
              </div>
              <div className="job-actions">
                {job.status === "ready" && (
                  <button
                    className="primary small"
                    type="button"
                    onClick={() => props.onOpen(job)}
                  >
                    풀기 →
                  </button>
                )}
                {!active && (
                  <button
                    className="icon-btn small"
                    type="button"
                    onClick={() => props.onDismiss(job.id)}
                    aria-label="작업 닫기"
                    title="목록에서 제거"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
