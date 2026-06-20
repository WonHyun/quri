import { z } from "zod";

/** 문항당 허용되는 선지 수 범위 (단일 출처) */
export const MIN_CHOICE_COUNT = 2;
export const MAX_CHOICE_COUNT = 5;
export const DEFAULT_CHOICE_COUNT = 4;

/** 단일 객관식 문제 (선지 2~5개) */
export const GeneratedQuestionSchema = z
  .object({
    question: z.string().min(1),
    options: z
      .array(z.string().min(1))
      .min(MIN_CHOICE_COUNT)
      .max(MAX_CHOICE_COUNT),
    correctIndex: z.number().int().min(0),
    explanation: z.string().min(1),
  })
  .superRefine((q, ctx) => {
    if (q.correctIndex > q.options.length - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctIndex"],
        message: `correctIndex(${q.correctIndex})가 보기 개수(${q.options.length})를 벗어났습니다.`,
      });
    }
  });

export const GeneratedQuizSchema = z.array(GeneratedQuestionSchema).min(1);

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

/** 지원하는 난이도 값 (단일 출처) */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** 한 퀴즈의 문항 수 범위 (단일 출처) */
export const MIN_QUESTION_COUNT = 1;
export const MAX_QUESTION_COUNT = 100;
export const DEFAULT_QUESTION_COUNT = 5;
