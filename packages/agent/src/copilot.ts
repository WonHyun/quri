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
}

export interface GenerateQuizParams {
  topic: string;
  count: number;
  /** 문항당 선지 수 (기본 4, 2~5) */
  choiceCount?: number;
  /** 난이도 힌트 (선택) */
  difficulty?: Difficulty;
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

  constructor(opts: CopilotAgentOptions = {}) {
    this.bin = opts.bin ?? process.env.COPILOT_BIN ?? "copilot";
    this.model = opts.model ?? process.env.COPILOT_MODEL ?? "auto";
    this.timeoutMs =
      opts.timeoutMs ?? Number(process.env.COPILOT_TIMEOUT_MS ?? 120000);
  }

  async generateQuiz(params: GenerateQuizParams): Promise<GeneratedQuiz> {
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

function buildPrompt(params: GenerateQuizParams): string {
  const { topic, count, difficulty } = params;
  const choiceCount = clampChoiceCount(params.choiceCount);
  const maxIndex = choiceCount - 1;
  const diff = difficulty ? `난이도는 "${difficulty}" 수준으로 맞춰라.` : "";
  const optionSchema = Array(choiceCount).fill("string").join(",");
  return [
    `너는 학습용 퀴즈 출제자다. 주제 "${topic}"에 대한 한국어 객관식 ${choiceCount}지선다 문제를 정확히 ${count}개 만들어라.`,
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
