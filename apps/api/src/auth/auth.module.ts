import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module";
import { MailModule } from "../mail/mail.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";

const DEV_FALLBACK_SECRET = "dev-insecure-secret-change-me";

/**
 * JWT 시크릿을 해석한다. 운영(NODE_ENV=production)에서는 안전하지 않은
 * 폴백을 허용하지 않고, 미설정 시 부팅을 중단해 취약한 토큰 발급을 막는다.
 */
function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_SECRET");
  const isProd = config.get<string>("NODE_ENV") === "production";
  if (!secret || secret === DEV_FALLBACK_SECRET) {
    if (isProd) {
      throw new Error(
        "JWT_SECRET 가 설정되지 않았습니다. 운영 환경에서는 강력한 무작위 시크릿을 반드시 지정해야 합니다.",
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

/**
 * 인증 모듈. JwtModule 과 가드를 전역으로 노출해 다른 도메인 모듈이
 * 별도 설정 없이 JwtAuthGuard 를 사용할 수 있게 한다.
 */
@Global()
@Module({
  imports: [
    UsersModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: {
          expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "7d",
        },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
