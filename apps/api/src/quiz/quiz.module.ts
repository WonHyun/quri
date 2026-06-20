import { Module } from "@nestjs/common";
import { QuizController } from "./quiz.controller";
import { QuizJobsController } from "./quiz-jobs.controller";
import { QuizService } from "./quiz.service";
import { QuizJobsService } from "./quiz-jobs.service";
import { AgentModule } from "../agent/agent.module";
import { OwnershipModule } from "../ownership/ownership.module";
import { AttemptsModule } from "../attempts/attempts.module";

@Module({
  imports: [AgentModule, OwnershipModule, AttemptsModule],
  controllers: [QuizController, QuizJobsController],
  providers: [QuizService, QuizJobsService],
})
export class QuizModule {}
