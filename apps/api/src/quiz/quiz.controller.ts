import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { QuizService } from "./quiz.service";
import { OwnershipService } from "../ownership/ownership.service";
import { AttemptsService } from "../attempts/attempts.service";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";

/**
 * 퀴즈 애플리케이션 계층 — 콘텐츠(QuizService)·소유권(OwnershipService)·
 * 기록(AttemptsService) 도메인을 조합한다. 모든 엔드포인트는 인증 필요.
 */
@UseGuards(JwtAuthGuard)
@Controller("api/quizzes")
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly ownership: OwnershipService,
    private readonly attempts: AttemptsService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuizDto) {
    const quiz = await this.quizService.generateAndCreate(dto);
    await this.ownership.create(quiz.id, user.id);
    return this.quizService.toPublic(quiz);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.ownership.listOwned(user.id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.ownership.assertAccess(id, user.id);
    return this.quizService.findPublic(id);
  }

  @Post(":id/submit")
  async submit(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    await this.ownership.assertAccess(id, user.id);
    const quiz = await this.quizService.getQuizWithQuestions(id);
    return this.attempts.record(user.id, quiz.id, quiz.questions, dto.answers);
  }
}
