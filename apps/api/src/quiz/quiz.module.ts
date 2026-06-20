import { Module } from "@nestjs/common";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";
import { AgentModule } from "../agent/agent.module";
import { OwnershipModule } from "../ownership/ownership.module";
import { AttemptsModule } from "../attempts/attempts.module";

@Module({
  imports: [AgentModule, OwnershipModule, AttemptsModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
