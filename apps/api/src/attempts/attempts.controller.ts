import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AttemptsService } from "./attempts.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

@UseGuards(JwtAuthGuard)
@Controller("api/me/attempts")
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    const safe =
      parsed && Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, 200)
        : undefined;
    return this.attempts.listForUser(user.id, safe);
  }
}
