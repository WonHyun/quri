import { ForbiddenException, Injectable } from "@nestjs/common";
import { QuizVisibility } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 소유권 도메인 — 유저와 퀴즈의 소유 관계 및 가시성을 관리한다.
 * 퀴즈 콘텐츠(QuizService)와 분리되어, 동일 퀴즈를 향후 여러 유저에게
 * 노출(PUBLIC)하는 확장의 단일 지점이 된다.
 */
@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  /** 새 퀴즈에 소유권을 부여한다(기본 비공개). */
  create(quizId: string, ownerId: string) {
    return this.prisma.quizOwnership.create({
      data: { quizId, ownerId, visibility: QuizVisibility.PRIVATE },
    });
  }

  /** 유저가 소유한 퀴즈 목록(문항 수 포함). */
  async listOwned(ownerId: string) {
    const ownerships = await this.prisma.quizOwnership.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: {
        quiz: { include: { _count: { select: { questions: true } } } },
      },
    });
    return ownerships.map((o) => ({
      id: o.quiz.id,
      topic: o.quiz.topic,
      difficulty: o.quiz.difficulty,
      visibility: o.visibility,
      createdAt: o.quiz.createdAt,
      questionCount: o.quiz._count.questions,
    }));
  }

  /** 유저가 해당 퀴즈에 접근 가능한지(소유자이거나 공개) 여부. */
  async canAccess(quizId: string, userId: string): Promise<boolean> {
    const ownership = await this.prisma.quizOwnership.findUnique({
      where: { quizId },
    });
    if (!ownership) {
      // 소유권 레코드가 없으면 접근 정책상 막는다.
      return false;
    }
    return (
      ownership.ownerId === userId ||
      ownership.visibility === QuizVisibility.PUBLIC
    );
  }

  /** 접근 권한을 강제하고, 없으면 403을 던진다. */
  async assertAccess(quizId: string, userId: string): Promise<void> {
    if (!(await this.canAccess(quizId, userId))) {
      throw new ForbiddenException("이 퀴즈에 접근할 수 없습니다.");
    }
  }

  /** 소유자만 가시성을 변경할 수 있다(향후 공개 노출 토글용). */
  async setVisibility(
    quizId: string,
    ownerId: string,
    visibility: QuizVisibility,
  ) {
    const ownership = await this.prisma.quizOwnership.findUnique({
      where: { quizId },
    });
    if (!ownership || ownership.ownerId !== ownerId) {
      throw new ForbiddenException("소유자만 공개 설정을 변경할 수 있습니다.");
    }
    return this.prisma.quizOwnership.update({
      where: { quizId },
      data: { visibility },
    });
  }
}
