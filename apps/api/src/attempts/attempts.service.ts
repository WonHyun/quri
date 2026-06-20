import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface GradingQuestion {
  id: string;
  text: string;
  options: Prisma.JsonValue;
  correctIndex: number;
  explanation: string;
}

interface SubmittedAnswer {
  questionId: string;
  selectedIndex: number;
}

/**
 * 기록 도메인 — 유저의 퀴즈 제출을 채점하고 시도(QuizAttempt) + 문항별
 * 응답(AnswerRecord)을 영속화한다. 대시보드 집계의 데이터 소스.
 */
@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 제출 답안을 채점하고, 유저 단위 시도로 저장한 뒤 결과를 반환한다. */
  async record(
    userId: string,
    quizId: string,
    questions: GradingQuestion[],
    answers: SubmittedAnswer[],
  ) {
    const selectedById = new Map(
      answers.map((a) => [a.questionId, a.selectedIndex]),
    );

    const results = questions.map((q) => {
      const selectedIndex = selectedById.get(q.id);
      const answered = selectedIndex !== undefined;
      const isCorrect = answered && selectedIndex === q.correctIndex;
      return {
        questionId: q.id,
        text: q.text,
        options: q.options as string[],
        selectedIndex: answered ? selectedIndex : null,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const answeredResults = results.filter((r) => r.selectedIndex !== null);
    const score = answeredResults.filter((r) => r.isCorrect).length;
    const total = questions.length;

    await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        total,
        answers: {
          create: answeredResults.map((r) => ({
            questionId: r.questionId,
            selectedIndex: r.selectedIndex as number,
            isCorrect: r.isCorrect,
          })),
        },
      },
    });

    return { quizId, total, score, results };
  }

  /** 유저의 시도 기록 목록(대시보드/기록 화면용). */
  async listForUser(userId: string, limit = 50) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { quiz: { select: { topic: true, difficulty: true } } },
    });
    return attempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      topic: a.quiz.topic,
      difficulty: a.quiz.difficulty,
      score: a.score,
      total: a.total,
      createdAt: a.createdAt,
    }));
  }
}
