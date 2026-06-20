import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import {
  DEFAULT_CHOICE_COUNT,
  Difficulty,
  GeneratedQuiz,
  GeneratedQuizSchema,
  MAX_CHOICE_COUNT,
  MIN_CHOICE_COUNT,
} from "./schema";

export interface CopilotAgentOptions {
  /** copilot 바이너리 이름/경로 (PATH 상에 있어야 함) */
  bin?: string;
  /** 사용할 모델 ("auto" 권장) */
  model?: string;
  /** 단일 호출 타임아웃(ms) */
  timeoutMs?: number;
  /** 한 번의 Copilot 호출에서 생성할 최대 문항 수 (기본 10) */
  batchSize?: number;
  /** 동시에 실행할 배치 수 (기본 2) */
  concurrency?: number;
}

export interface GenerateQuizParams {
  topic: string;
  count: number;
  /** 문항당 선지 수 (기본 4, 2~5) */
  choiceCount?: number;
  /** 난이도 힌트 (선택) */
  difficulty?: Difficulty;
  /** 시험 프리셋에서 주입되는 출제 특화 지시 (선택) */
  presetHints?: string[];
  /** 출제 범위를 좁히는 과목/영역 (선택) */
  subject?: string;
}

export class CopilotError extends Error {}

/**
 * Copilot CLI(`copilot -p`)를 비대화 모드로 구동해 퀴즈를 생성하는 에이전트.
 * 출력은 zod 스키마로 검증한다.
 */
export class CopilotAgent {
  private readonly bin: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly batchSize: number;
  private readonly concurrency: number;

  constructor(opts: CopilotAgentOptions = {}) {
    this.bin = opts.bin ?? process.env.COPILOT_BIN ?? "copilot";
    this.model = opts.model ?? process.env.COPILOT_MODEL ?? "auto";
    this.timeoutMs =
      opts.timeoutMs ?? Number(process.env.COPILOT_TIMEOUT_MS ?? 120000);
    this.batchSize = clampPositive(
      opts.batchSize ?? Number(process.env.COPILOT_BATCH_SIZE ?? 10),
      10,
    );
    this.concurrency = clampPositive(
      opts.concurrency ?? Number(process.env.COPILOT_CONCURRENCY ?? 2),
      2,
    );
  }

  /**
   * 퀴즈를 생성한다. 문항 수가 batchSize 를 넘으면 여러 번의 Copilot 호출로
   * 분할(배치)해 제한된 동시성으로 실행하고 결과를 병합한다. 대량 문항에서도
   * 단일 호출 타임아웃·실패 위험을 낮춘다.
   */
  async generateQuiz(params: GenerateQuizParams): Promise<GeneratedQuiz> {
    const total = Math.max(1, Math.trunc(params.count));
    const sizes = splitIntoBatches(total, this.batchSize);
    if (sizes.length === 1) {
      return this.generateBatch({ ...params, count: sizes[0] });
    }

    const batches = await runWithConcurrency(sizes, this.concurrency, (n) =>
      this.generateBatch({ ...params, count: n }),
    );
    return batches.flat();
  }

  /** 단일 Copilot 호출로 정확히 params.count 개 문항을 생성·검증한다. */
  private async generateBatch(
    params: GenerateQuizParams,
  ): Promise<GeneratedQuiz> {
    const prompt = buildPrompt(params);
    const raw = await this.runPrompt(prompt);
    const json = extractJsonArray(raw);
    if (!json) {
      throw new CopilotError(
        `Copilot 응답에서 JSON 배열을 찾지 못했습니다. 원문: ${truncate(raw, 400)}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new CopilotError(`JSON 파싱 실패: ${(e as Error).message}`);
    }

    const result = GeneratedQuizSchema.safeParse(parsed);
    if (!result.success) {
      throw new CopilotError(
        `생성된 퀴즈가 스키마와 맞지 않습니다: ${result.error.message}`,
      );
    }
    return result.data;
  }

  private runPrompt(prompt: string): Promise<string> {
    const args = [
      "-p",
      prompt,
      "-s",
      "--allow-all-tools",
      "--no-color",
      "--no-custom-instructions",
      "--no-ask-user",
      "--disable-builtin-mcps",
    ];
    if (this.model) {
      args.push("--model", this.model);
    }

    return new Promise<string>((resolve, reject) => {
      const child = spawn(this.bin, args, {
        cwd: tmpdir(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new CopilotError(`Copilot 호출 타임아웃 (${this.timeoutMs}ms)`));
      }, this.timeoutMs);

      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(
          new CopilotError(
            `Copilot 실행 실패 (bin: ${this.bin}): ${err.message}`,
          ),
        );
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new CopilotError(
              `Copilot 비정상 종료 (code ${code}): ${truncate(stderr || stdout, 400)}`,
            ),
          );
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}

/** 양의 정수로 보정하고, 유효하지 않으면 fallback 을 쓴다. */
function clampPositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : fallback;
}

/** total 을 size 이하의 배치 크기 배열로 나눈다. 예: (25,10) → [10,10,5] */
export function splitIntoBatches(total: number, size: number): number[] {
  const n = Math.max(1, Math.trunc(total));
  const s = Math.max(1, Math.trunc(size));
  const batches: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    const take = Math.min(s, remaining);
    batches.push(take);
    remaining -= take;
  }
  return batches;
}

/**
 * 항목들을 최대 limit 개씩 동시에 처리하고, 입력 순서를 유지한 결과 배열을 반환한다.
 * 한 작업이라도 실패하면 즉시 전파한다(나머지는 결과에 반영되지 않음).
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const max = Math.max(1, Math.trunc(limit));
  let cursor = 0;

  async function pump(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from({ length: Math.min(max, items.length) }, () =>
    pump(),
  );
  await Promise.all(runners);
  return results;
}

function buildPrompt(params: GenerateQuizParams): string {
  const { topic, count, difficulty, subject, presetHints } = params;
  const choiceCount = clampChoiceCount(params.choiceCount);
  const maxIndex = choiceCount - 1;
  const diff = difficulty ? `난이도는 "${difficulty}" 수준으로 맞춰라.` : "";
  const optionSchema = Array(choiceCount).fill("string").join(",");

  const scope = subject
    ? `출제 범위는 "${subject}" 영역에 집중하라.`
    : "";
  const examBlock =
    presetHints && presetHints.length > 0
      ? ["시험 특화 지침:", ...presetHints.map((h) => `- ${h}`)].join("\n")
      : "";

  return [
    `너는 학습용 퀴즈 출제자다. 주제 "${topic}"에 대한 한국어 객관식 ${choiceCount}지선다 문제를 정확히 ${count}개 만들어라.`,
    examBlock,
    scope,
    diff,
    "규칙:",
    `- 각 문제는 보기(options) ${choiceCount}개를 가지며, 정답은 정확히 하나다.`,
    `- correctIndex는 0~${maxIndex} 사이의 정수로 정답 보기의 인덱스를 가리킨다.`,
    "- explanation에는 왜 그 답이 정답인지에 대한 간결한 해설을 한국어로 작성한다.",
    "- 보기들은 서로 명확히 구분되며 중복되지 않아야 한다.",
    "출력 형식: 설명/마크다운/코드펜스 없이 순수 JSON 배열만 출력하라.",
    `JSON 스키마: [{"question":string,"options":[${optionSchema}],"correctIndex":number,"explanation":string}]`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 선지 수를 허용 범위(2~5)로 보정하고, 미지정 시 기본값을 쓴다. */
function clampChoiceCount(value?: number): number {
  if (value === undefined) return DEFAULT_CHOICE_COUNT;
  return Math.max(MIN_CHOICE_COUNT, Math.min(MAX_CHOICE_COUNT, Math.trunc(value)));
}

/** 응답 텍스트에서 첫 번째 균형 잡힌 JSON 배열을 추출한다. */
export function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "[") {
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
