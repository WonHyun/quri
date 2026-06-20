import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** 사용자 도메인 — 사용자 레코드의 조회/생성을 담당한다. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    displayName?: string;
    emailVerified?: boolean;
    isGuest?: boolean;
  }) {
    return this.prisma.user.create({ data });
  }
}
