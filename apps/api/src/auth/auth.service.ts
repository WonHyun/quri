import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { JwtPayload } from "./auth.types";

const SALT_ROUNDS = 10;
const CODE_TTL_MS = 10 * 60 * 1000; // 10분
const MAX_VERIFY_ATTEMPTS = 5;
// 비활성 게스트 계정 보관 기간 — 이 기간이 지나면 데이터와 함께 정리한다.
const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/** 인증 도메인 — 이메일 인증 기반 회원가입/로그인과 JWT 발급을 담당한다. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * 회원가입 1단계 — 가입 정보를 보류 레코드로 저장하고 이메일로 인증 코드를 발송한다.
   * 실제 User 는 아직 생성되지 않는다.
   */
  async requestSignup(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.emailVerification.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName?.trim() || null,
        codeHash,
        expiresAt,
        attempts: 0,
      },
      update: {
        passwordHash,
        displayName: displayName?.trim() || null,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    await this.mail.sendVerificationCode(normalizedEmail, code);
    return { email: normalizedEmail, expiresInSeconds: CODE_TTL_MS / 1000 };
  }

  /**
   * 회원가입 2단계 — 인증 코드를 검증하고 User 를 생성한 뒤 JWT 를 발급한다.
   */
  async verifySignup(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const pending = await this.prisma.emailVerification.findUnique({
      where: { email: normalizedEmail },
    });
    if (!pending) {
      throw new BadRequestException(
        "인증 요청을 찾을 수 없습니다. 다시 회원가입을 시도해 주세요.",
      );
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailVerification.delete({
        where: { email: normalizedEmail },
      });
      throw new BadRequestException(
        "인증 코드가 만료되었습니다. 코드를 다시 요청해 주세요.",
      );
    }
    if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.prisma.emailVerification.delete({
        where: { email: normalizedEmail },
      });
      throw new BadRequestException(
        "인증 시도 횟수를 초과했습니다. 코드를 다시 요청해 주세요.",
      );
    }

    const ok = await bcrypt.compare(code, pending.codeHash);
    if (!ok) {
      await this.prisma.emailVerification.update({
        where: { email: normalizedEmail },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("인증 코드가 올바르지 않습니다.");
    }

    // 경합 보호: 코드 검증 사이에 동일 이메일이 가입되었는지 재확인
    const already = await this.users.findByEmail(normalizedEmail);
    if (already) {
      await this.prisma.emailVerification.delete({
        where: { email: normalizedEmail },
      });
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    const user = await this.users.create({
      email: normalizedEmail,
      passwordHash: pending.passwordHash,
      displayName: pending.displayName ?? undefined,
      emailVerified: true,
    });
    await this.prisma.emailVerification.delete({
      where: { email: normalizedEmail },
    });

    return this.issue(user.id, user.email, user.displayName, user.isGuest);
  }

  /** 보류 중인 가입 요청에 대해 새 인증 코드를 재발송한다. */
  async resendCode(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const pending = await this.prisma.emailVerification.findUnique({
      where: { email: normalizedEmail },
    });
    if (!pending) {
      throw new BadRequestException(
        "진행 중인 회원가입 요청이 없습니다. 다시 회원가입을 시도해 주세요.",
      );
    }
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await this.prisma.emailVerification.update({
      where: { email: normalizedEmail },
      data: { codeHash, expiresAt, attempts: 0 },
    });
    await this.mail.sendVerificationCode(normalizedEmail, code);
    return { email: normalizedEmail, expiresInSeconds: CODE_TTL_MS / 1000 };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    return this.issue(user.id, user.email, user.displayName, user.isGuest);
  }

  /**
   * 게스트 로그인 — 이메일 인증 없이 임시 계정을 생성하고 JWT 를 발급한다.
   * 게스트도 정식 User 레코드를 가지므로 퀴즈 생성/풀이/대시보드를 그대로 사용할 수 있다.
   * 누적을 막기 위해 일정 기간이 지난 게스트 계정은 주기적으로 정리된다.
   */
  async createGuest() {
    const email = `guest_${randomUUID()}@guest.quri.local`;
    const passwordHash = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
    const user = await this.users.create({
      email,
      passwordHash,
      displayName: "게스트",
      emailVerified: false,
      isGuest: true,
    });
    return this.issue(user.id, user.email, user.displayName, true);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** 만료된 이메일 인증 보류 레코드를 주기적으로 정리한다(매시 정각). */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredVerifications(): Promise<void> {
    const { count } = await this.prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      this.logger.log(`만료된 이메일 인증 레코드 ${count}건 정리 완료.`);
    }
  }

  /**
   * 오래된 게스트 계정과 그 데이터(소유 퀴즈·풀이 기록)를 주기적으로 정리한다(매일 자정).
   * 게스트는 가입 절차 없이 누구나 만들 수 있어 누적되므로, 보관 기간이 지난 계정은
   * 소유 퀴즈를 먼저 삭제(연쇄로 문항/기록 제거)한 뒤 계정을 제거한다.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeStaleGuests(): Promise<void> {
    const cutoff = new Date(Date.now() - GUEST_TTL_MS);
    const stale = await this.prisma.user.findMany({
      where: { isGuest: true, createdAt: { lt: cutoff } },
      select: { id: true },
    });
    if (stale.length === 0) return;

    const guestIds = stale.map((u) => u.id);
    const owned = await this.prisma.quizOwnership.findMany({
      where: { ownerId: { in: guestIds } },
      select: { quizId: true },
    });
    const quizIds = owned.map((o) => o.quizId);

    await this.prisma.$transaction([
      this.prisma.quiz.deleteMany({ where: { id: { in: quizIds } } }),
      this.prisma.user.deleteMany({ where: { id: { in: guestIds } } }),
    ]);
    this.logger.log(
      `오래된 게스트 계정 ${guestIds.length}건(퀴즈 ${quizIds.length}건) 정리 완료.`,
    );
  }

  private async issue(
    id: string,
    email: string,
    displayName: string | null,
    isGuest: boolean,
  ) {
    const payload: JwtPayload = { sub: id, email, isGuest };
    const token = await this.jwt.signAsync(payload);
    return { token, user: { id, email, displayName, isGuest } };
  }
}
