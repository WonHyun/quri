import type { Quiz } from "../types";

export function TakingView(props: {
  quiz: Quiz;
  answers: Record<string, number>;
  setAnswers: (v: Record<string, number>) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const { quiz, answers, setAnswers } = props;
  const answeredCount = Object.keys(answers).length;
  const total = quiz.questions.length;
  const pct = total ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <section className="card fade-in">
      <div className="quiz-head">
        <h2>{quiz.topic}</h2>
        <span className="chip">
          <span className="btn-i">📝</span> {total}문항
        </span>
      </div>

      <div className="progress">
        <div className="progress-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-meta">
          {answeredCount} / {total} 문항 응답됨
        </div>
      </div>

      {quiz.questions.map((q, i) => (
        <div key={q.id} className="question">
          <h3>
            <span className="q-index">{i + 1}</span>
            <span>{q.text}</span>
          </h3>
          <div className="options">
            {q.options.map((opt, idx) => (
              <label
                key={idx}
                className={answers[q.id] === idx ? "option selected" : "option"}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === idx}
                  onChange={() => setAnswers({ ...answers, [q.id]: idx })}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="submit-bar">
        <button
          className="primary"
          onClick={props.onSubmit}
          disabled={props.disabled || answeredCount === 0}
        >
          <span className="btn-i">✅</span> 채점하기 ({answeredCount}/{total})
        </button>
      </div>
    </section>
  );
}
