import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AuthUser, JwtPayload } from "./auth.types";

/** Authorization: Bearer <token> 를 검증해 요청에 user 를 주입하는 가드. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("인증이 필요합니다.");
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        isGuest: payload.isGuest ?? false,
      };
      (req as Request & { user: AuthUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }
}
