import {
  DIFFICULTY_LABELS,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
} from "../constants";
import type { Difficulty, ExamPreset } from "../types";

export function HomeView(props: {
  topic: string;
  setTopic: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  choiceCount: number;
  setChoiceCount: (v: number) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  presets: ExamPreset[];
  presetSlug: string | null;
  onSelectPreset: (slug: string) => void;
  subjects: string[];
  subject: string | null;
  setSubject: (v: string | null) => void;
  onRandom: () => void;
  onGenerate: () => void;
  disabled: boolean;
}) {
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const clampCount = (n: number) =>
    Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, n));
  const clampChoiceCount = (n: number) => Math.max(2, Math.min(5, n));

  return (
    <section className="card fade-in">
      <h2>새 퀴즈 만들기</h2>
      <p className="card-sub">
        시험을 고르면 출제 경향에 맞춰 출제돼요. 직접 주제를 입력해도 됩니다.
      </p>

      {props.presets.length > 0 && (
        <div className="field">
          <span className="label">자격증 시험</span>
          <div className="preset-grid" role="group" aria-label="자격증 시험 프리셋">
            {props.presets.map((p) => (
              <button
                key={p.slug}
                type="button"
                className={`preset-chip${
                  props.presetSlug === p.slug ? " is-active" : ""
                }`}
                aria-pressed={props.presetSlug === p.slug}
                onClick={() => props.onSelectPreset(p.slug)}
                title={p.blurb}
              >
                <span className="preset-name">{p.name}</span>
                <span className="preset-cat">{p.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {props.presetSlug && props.subjects.length > 0 && (
        <div className="field">
          <span className="label">과목 (선택)</span>
          <div className="segmented wrap" role="group" aria-label="과목">
            <button
              type="button"
              aria-pressed={props.subject === null}
              onClick={() => props.setSubject(null)}
            >
              전체
            </button>
            {props.subjects.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={props.subject === s}
                onClick={() => props.setSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span className="label">주제 (직접 입력)</span>
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
              disabled={props.count <= MIN_QUESTION_COUNT}
              aria-label="문항 수 줄이기"
            >
              −
            </button>
            <span className="value">{props.count}</span>
            <button
              type="button"
              onClick={() => props.setCount(clampCount(props.count + 1))}
              disabled={props.count >= MAX_QUESTION_COUNT}
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
