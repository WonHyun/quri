import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { OwnershipModule } from "./ownership/ownership.module";
import { AttemptsModule } from "./attempts/attempts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { QuizModule } from "./quiz/quiz.module";
import { PresetsModule } from "./presets/presets.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    // 기본 레이트리밋: 60초당 IP별 100회. 인증 등 민감 엔드포인트는
    // 컨트롤러에서 @Throttle 로 더 엄격하게 제한한다.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    // 빌드 시 web 번들이 dist/public 에 복사되어 정적 서빙된다 (단일 App Service).
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "public"),
      exclude: ["/api/(.*)"],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OwnershipModule,
    AttemptsModule,
    DashboardModule,
    QuizModule,
    PresetsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
