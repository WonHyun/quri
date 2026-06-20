import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 대시보드 도메인 — 유저의 기록(QuizAttempt/AnswerRecord)을 집계한다.
 * 향후 기간 필터, 주제별 추이, 약점 분석 등으로 확장할 수 있도록
 * 집계 책임을 별도 모듈로 분리해 둔다.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** 개인 대시보드 요약 통계. */
  async stats(userId: string) {
    const [ownedQuizzes, attemptAgg, recentAttempts, byQuizRaw] =
      await Promise.all([
        this.prisma.quizOwnership.count({ where: { ownerId: userId } }),
        this.prisma.quizAttempt.aggregate({
          where: { userId },
          _count: { _all: true },
          _sum: { score: true, total: true },
        }),
        this.prisma.quizAttempt.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { quiz: { select: { topic: true } } },
        }),
        this.prisma.quizAttempt.groupBy({
          by: ["quizId"],
          where: { userId },
          _count: { _all: true },
          _sum: { score: true, total: true },
        }),
      ]);

    const totalAttempts = attemptAgg._count._all;
    const sumScore = attemptAgg._sum.score ?? 0;
    const sumTotal = attemptAgg._sum.total ?? 0;
    const averageAccuracy =
      sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0;

    // 주제 단위 정답률 — 같은 주제(topic)의 여러 퀴즈를 하나로 합산한다.
    // (Prisma 는 관계 필드로 groupBy 할 수 없으므로 quizId 집계 후 topic 으로 병합)
    const quizIds = byQuizRaw.map((r) => r.quizId);
    const quizzes = quizIds.length
      ? await this.prisma.quiz.findMany({
          where: { id: { in: quizIds } },
          select: { id: true, topic: true },
        })
      : [];
    const topicById = new Map(quizzes.map((q) => [q.id, q.topic]));

    const topicAgg = new Map<
      string,
      { score: number; total: number; attempts: number }
    >();
    for (const r of byQuizRaw) {
      const topic = topicById.get(r.quizId) ?? "(삭제됨)";
      const acc = topicAgg.get(topic) ?? { score: 0, total: 0, attempts: 0 };
      acc.score += r._sum.score ?? 0;
      acc.total += r._sum.total ?? 0;
      acc.attempts += r._count._all;
      topicAgg.set(topic, acc);
    }
    const byTopic = [...topicAgg.entries()]
      .map(([topic, a]) => ({
        topic,
        attempts: a.attempts,
        accuracy: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);

    return {
      ownedQuizzes,
      totalAttempts,
      averageAccuracy,
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        quizId: a.quizId,
        topic: a.quiz.topic,
        score: a.score,
        total: a.total,
        createdAt: a.createdAt,
      })),
      byTopic,
    };
  }
}
