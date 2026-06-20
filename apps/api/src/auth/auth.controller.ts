import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ResendCodeDto } from "./dto/resend-code.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { AuthUser } from "./auth.types";

// 인증 엔드포인트는 무차별 대입/메일 폭탄 방지를 위해 분당 5회로 제한한다.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 회원가입 1단계: 인증 코드 발송 */
  @Throttle(AUTH_THROTTLE)
  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return this.auth.requestSignup(dto.email, dto.password, dto.displayName);
  }

  /** 회원가입 2단계: 인증 코드 확인 후 계정 생성 */
  @Throttle(AUTH_THROTTLE)
  @Post("signup/verify")
  verify(@Body() dto: VerifyEmailDto) {
    return this.auth.verifySignup(dto.email, dto.code);
  }

  /** 인증 코드 재발송 */
  @Throttle(AUTH_THROTTLE)
  @Post("signup/resend")
  resend(@Body() dto: ResendCodeDto) {
    return this.auth.resendCode(dto.email);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  /** 게스트 로그인: 가입 없이 임시 계정으로 바로 시작 */
  @Throttle(AUTH_THROTTLE)
  @Post("guest")
  guest() {
    return this.auth.createGuest();
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
