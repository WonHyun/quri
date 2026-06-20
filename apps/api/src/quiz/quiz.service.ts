import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CopilotError, ExamPreset, findPreset } from "@quri/agent";
import { PrismaService } from "../prisma/prisma.service";
import { AgentService } from "../agent/agent.service";
import { CreateQuizDto } from "./dto/create-quiz.dto";

const DEFAULT_QUESTION_COUNT = 5;

/**
 * 저장·표시용 topic 을 결정한다.
 * 프리셋이 있으면 시험명(+과목)으로 파생하고, 없으면 사용자가 입력한 자유주제를 쓴다.
 */
function deriveTopic(
  dto: CreateQuizDto,
  preset: ExamPreset | undefined,
  subject: string | undefined,
): string {
  if (preset) {
    return subject ? `${preset.name} · ${subject}` : preset.name;
  }
  return dto.topic;
}

/** 정답을 숨긴 문제 형태 (풀이용) */
function toPublicQuestion(q: {
  id: string;
  text: string;
  options: Prisma.JsonValue;
  order: number;
}) {
  return {
    id: q.id,
    text: q.text,
    options: q.options as string[],
    order: q.order,
  };
}

/** 정답을 숨긴 퀴즈 형태 (풀이/조회용) */
function toPublicQuiz(quiz: {
  id: string;
  topic: string;
  createdAt: Date;
  questions: Parameters<typeof toPublicQuestion>[0][];
}) {
  return {
    id: quiz.id,
    topic: quiz.topic,
    createdAt: quiz.createdAt,
    questions: quiz.questions.map(toPublicQuestion),
  };
}

/**
 * 퀴즈 콘텐츠 도메인 — 문제 생성/조회만 담당한다.
 * 소유권/유저 개념은 알지 못하며, 그 책임은 OwnershipService 가 가진다.
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AgentService,
  ) {}

  /** id로 퀴즈+문제를 조회하고 없으면 404를 던진다. */
  async getQuizWithQuestions(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) {
      throw new NotFoundException("퀴즈를 찾을 수 없습니다.");
    }
    return quiz;
  }

  /** 주제로 문제를 생성·저장하고 생성된 퀴즈(+문제)를 반환한다. */
  async generateAndCreate(dto: CreateQuizDto) {
    const count = dto.count ?? DEFAULT_QUESTION_COUNT;

    // 프리셋이 지정되면 출제 지침/과목을 주입하고, 표시용 topic 을 파생한다.
    const preset = dto.presetSlug ? findPreset(dto.presetSlug) : undefined;
    const subject =
      dto.subject && preset?.subjects.includes(dto.subject)
        ? dto.subject
        : undefined;
    const topic = deriveTopic(dto, preset, subject);

    let generated;
    try {
      generated = await this.agent.generateQuiz({
        topic,
        count,
        choiceCount: dto.choiceCount,
        difficulty: dto.difficulty,
        presetHints: preset?.promptHints,
        subject,
      });
    } catch (e) {
      if (e instanceof CopilotError) {
        throw new BadGatewayException(`문제 생성에 실패했습니다: ${e.message}`);
      }
      throw e;
    }

    return this.prisma.quiz.create({
      data: {
        topic,
        difficulty: dto.difficulty ?? null,
        presetSlug: preset?.slug ?? null,
        subject: subject ?? null,
        questions: {
          create: generated.map((q, i) => ({
            text: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            order: i,
          })),
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  }

  /** 단일 퀴즈 (정답 숨김, 풀이용) */
  async findPublic(id: string) {
    return toPublicQuiz(await this.getQuizWithQuestions(id));
  }

  /** 퀴즈 엔티티를 정답 숨긴 공개 형태로 변환한다. */
  toPublic(quiz: Parameters<typeof toPublicQuiz>[0]) {
    return toPublicQuiz(quiz);
  }
}
