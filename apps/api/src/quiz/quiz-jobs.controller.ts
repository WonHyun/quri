import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from "@nestjs/common";
import { QuizJobsService } from "./quiz-jobs.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

/**
 * 비동기 퀴즈 생성 작업 상태 조회/정리.
 * 생성 요청은 POST /api/quizzes 가 작업을 만들고, 여기서 진행 상태를 폴링한다.
 * (api/quizzes/:id 와 경로가 겹치지 않도록 별도 컨트롤러로 분리)
 */
@UseGuards(JwtAuthGuard)
@Controller("api/quiz-jobs")
export class QuizJobsController {
  constructor(private readonly jobs: QuizJobsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.jobs.list(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.jobs.get(user.id, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    this.jobs.remove(user.id, id);
  }
}
