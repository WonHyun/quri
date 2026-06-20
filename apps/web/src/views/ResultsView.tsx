import type { Quiz, SubmitResult } from "../types";

export function ResultsView(props: {
  quiz: Quiz;
  result: SubmitResult;
  onRetry: () => void;
  onHome: () => void;
}) {
  const { quiz, result } = props;
  const pct = Math.round((result.score / result.total) * 100);
  const cheer =
    pct === 100
      ? "완벽해요! 🎉"
      : pct >= 70
        ? "훌륭해요! 👏"
        : pct >= 40
          ? "좋은 출발이에요 💪"
          : "다시 도전해 봐요 🔁";

  return (
    <section className="card fade-in">
      <div className="result-head">
        <div
          className="score-ring"
          style={{ ["--pct" as string]: pct }}
          role="img"
          aria-label={`정답률 ${pct}퍼센트`}
        >
          <div>
            <div className="ring-pct">{pct}</div>
            <div className="ring-label">점</div>
          </div>
        </div>
        <div>
          <div className="score-text">
            <strong>
              {result.score} / {result.total}
            </strong>{" "}
            정답
          </div>
          <div className="score-sub">
            {quiz.topic} · {cheer}
          </div>
        </div>
      </div>

      {result.results.map((r, i) => (
        <div
          key={r.questionId}
          className={r.isCorrect ? "question correct" : "question wrong"}
        >
          <h3>
            <span className={r.isCorrect ? "verdict ok" : "verdict no"}>
              {r.isCorrect ? "✓" : "✕"}
            </span>
            <span>
              {i + 1}. {r.text}
            </span>
          </h3>
          <div className="options">
            {r.options.map((opt, idx) => {
              const isCorrect = idx === r.correctIndex;
              const isPicked = idx === r.selectedIndex;
              const cls = [
                "option",
                isCorrect ? "answer" : "",
                isPicked && !isCorrect ? "picked-wrong" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={idx} className={cls}>
                  <span>{opt}</span>
                  {isCorrect && <em>정답</em>}
                  {isPicked && !isCorrect && <em>내 선택</em>}
                </div>
              );
            })}
          </div>
          <p className="explanation">💡 {r.explanation}</p>
        </div>
      ))}

      <div className="actions">
        <button className="ghost" onClick={props.onRetry}>
          <span className="btn-i">🔁</span> 다시 풀기
        </button>
        <button className="primary" onClick={props.onHome}>
          <span className="btn-i">🏠</span> 새 퀴즈 만들기
        </button>
      </div>
    </section>
  );
}
