import { DIFFICULTY_LABELS } from "../constants";
import type { Difficulty } from "../types";

export function HomeView(props: {
  topic: string;
  setTopic: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  choiceCount: number;
  setChoiceCount: (v: number) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  onRandom: () => void;
  onGenerate: () => void;
  disabled: boolean;
}) {
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const clampCount = (n: number) => Math.max(1, Math.min(20, n));
  const clampChoiceCount = (n: number) => Math.max(2, Math.min(5, n));

  return (
    <section className="card fade-in">
      <h2>새 퀴즈 만들기</h2>
      <p className="card-sub">주제를 정하고 난이도와 문항 수, 선지 수를 골라보세요.</p>

      <label className="field">
        <span className="label">주제</span>
        <div className="topic-row">
          <input
            type="text"
            value={props.topic}
            placeholder="예: 광합성, 프랑스 혁명, 알고리즘…"
            onChange={(e) => props.setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && props.onGenerate()}
          />
          <button className="ghost" onClick={props.onRandom} type="button">
            <span className="btn-i">🎲</span> 랜덤
          </button>
        </div>
      </label>

      <div className="field-row">
        <div className="field">
          <span className="label">문항 수</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => props.setCount(clampCount(props.count - 1))}
              disabled={props.count <= 1}
              aria-label="문항 수 줄이기"
            >
              −
            </button>
            <span className="value">{props.count}</span>
            <button
              type="button"
              onClick={() => props.setCount(clampCount(props.count + 1))}
              disabled={props.count >= 20}
              aria-label="문항 수 늘리기"
            >
              +
            </button>
          </div>
        </div>

        <div className="field">
          <span className="label">선지 수</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() =>
                props.setChoiceCount(clampChoiceCount(props.choiceCount - 1))
              }
              disabled={props.choiceCount <= 2}
              aria-label="선지 수 줄이기"
            >
              −
            </button>
            <span className="value">{props.choiceCount}</span>
            <button
              type="button"
              onClick={() =>
                props.setChoiceCount(clampChoiceCount(props.choiceCount + 1))
              }
              disabled={props.choiceCount >= 5}
              aria-label="선지 수 늘리기"
            >
              +
            </button>
          </div>
        </div>

        <div className="field">
          <span className="label">난이도</span>
          <div className="segmented" role="group" aria-label="난이도">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={props.difficulty === d}
                onClick={() => props.setDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="primary"
        onClick={props.onGenerate}
        disabled={props.disabled}
      >
        <span className="btn-i">✨</span> 문제 생성하기
      </button>
    </section>
  );
}
