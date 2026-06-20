import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { QuizService } from "./quiz.service";
import { OwnershipService } from "../ownership/ownership.service";
import { CreateQuizDto } from "./dto/create-quiz.dto";

export type QuizJobStatus = "pending" | "running" | "ready" | "failed";

interface QuizJobRecord {
  id: string;
  userId: string;
  topic: string;
  count: number;
  status: QuizJobStatus;
  quizId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 클라이언트에 노출되는 작업 형태 (userId 제외). */
export interface QuizJobView {
  id: string;
  topic: string;
  count: number;
  status: QuizJobStatus;
  quizId: string | null;
  error: string | null;
  createdAt: string;
}

/** 완료/실패한 작업을 메모리에서 유지하는 시간 (이후 정리 대상). */
const COMPLETED_TTL_MS = 30 * 60 * 1000;

/**
 * 비동기 퀴즈 생성 작업 레지스트리(인메모리).
 *
 * 문제 생성(Copilot 호출)은 수십 초~수 분 걸릴 수 있어 요청을 블로킹하지 않는다.
 * 대신 작업을 큐에 넣고 즉시 작업 정보를 반환하며, 백그라운드에서 순차 처리한다.
 * 완성된 퀴즈는 기존대로 DB 에 저장되어 소유 목록에 노출되므로, 이 레지스트리는
 * "진행 상태 추적" 용도다(서버 재시작 시 진행 중 작업만 유실되며, 저장된 퀴즈는 보존).
 */
@Injectable()
export class QuizJobsService {
  private readonly logger = new Logger(QuizJobsService.name);
  private readonly jobs = new Map<string, QuizJobRecord>();
  private readonly payloads = new Map<string, CreateQuizDto>();
  private readonly queue: string[] = [];
  private draining = false;

  constructor(
    private readonly quizService: QuizService,
    private readonly ownership: OwnershipService,
  ) {}

  /** 생성 작업을 큐에 넣고 즉시 작업 정보를 반환한다(백그라운드 처리). */
  enqueue(userId: string, dto: CreateQuizDto): QuizJobView {
    this.prune();
    const preview = this.quizService.resolvePreview(dto);
    const now = new Date();
    const job: QuizJobRecord = {
      id: randomUUID(),
      userId,
      topic: preview.topic,
      count: preview.count,
      status: "pending",
      quizId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    // dto 를 작업과 함께 보관해 백그라운드에서 사용한다.
    this.payloads.set(job.id, dto);
    void this.drain();
    return toView(job);
  }

  /** 유저의 작업 목록(최신순). */
  list(userId: string): QuizJobView[] {
    this.prune();
    return [...this.jobs.values()]
      .filter((j) => j.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toView);
  }

  /** 단일 작업 조회(소유자 한정). 없으면 404. */
  get(userId: string, id: string): QuizJobView {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) {
      throw new NotFoundException("작업을 찾을 수 없습니다.");
    }
    return toView(job);
  }

  /** 완료/실패한 작업을 목록에서 제거한다(진행 중인 작업은 막지 않는다). */
  remove(userId: string, id: string): void {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) {
      throw new NotFoundException("작업을 찾을 수 없습니다.");
    }
    this.jobs.delete(id);
    this.payloads.delete(id);
  }

  /** 큐를 순차적으로 비운다(동시에 하나의 생성만 수행해 부하를 제한). */
  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const id = this.queue.shift()!;
        const job = this.jobs.get(id);
        const dto = this.payloads.get(id);
        if (!job || !dto) continue;
        await this.run(job, dto);
        this.payloads.delete(id);
      }
    } finally {
      this.draining = false;
    }
  }

  private async run(job: QuizJobRecord, dto: CreateQuizDto): Promise<void> {
    this.patch(job, { status: "running" });
    try {
      const quiz = await this.quizService.generateAndCreate(dto);
      await this.ownership.create(quiz.id, job.userId);
      this.patch(job, { status: "ready", quizId: quiz.id });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      this.logger.warn(`퀴즈 생성 작업 실패(${job.id}): ${message}`);
      this.patch(job, { status: "failed", error: message });
    }
  }

  private patch(job: QuizJobRecord, change: Partial<QuizJobRecord>): void {
    Object.assign(job, change, { updatedAt: new Date() });
  }

  /** TTL 이 지난 완료/실패 작업을 정리해 메모리를 제한한다. */
  private prune(): void {
    const cutoff = Date.now() - COMPLETED_TTL_MS;
    for (const [id, job] of this.jobs) {
      const done = job.status === "ready" || job.status === "failed";
      if (done && job.updatedAt.getTime() < cutoff) {
        this.jobs.delete(id);
        this.payloads.delete(id);
      }
    }
  }
}

function toView(job: QuizJobRecord): QuizJobView {
  return {
    id: job.id,
    topic: job.topic,
    count: job.count,
    status: job.status,
    quizId: job.quizId,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
  };
}
