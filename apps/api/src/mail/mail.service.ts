import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * 메일 발송 서비스 — Gmail SMTP(앱 비밀번호) 기반.
 * MAIL_* 환경변수가 비어 있으면 발송을 건너뛰고 코드를 로그로만 남긴다(로컬 개발용).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("MAIL_HOST") ?? "smtp.gmail.com";
    const port = Number(this.config.get<string>("MAIL_PORT") ?? 587);
    const user = this.config.get<string>("MAIL_USERNAME");
    const pass = this.config.get<string>("MAIL_PASSWORD");
    this.from =
      this.config.get<string>("MAIL_FROM") ?? (user ? `Quri <${user}>` : "Quri");

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        "MAIL_USERNAME/MAIL_PASSWORD 가 설정되지 않아 인증 메일을 실제로 발송하지 않습니다. 코드는 로그로만 출력됩니다.",
      );
    }
  }

  /** 6자리 인증 코드를 이메일로 발송한다. */
  async sendVerificationCode(to: string, code: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV] ${to} 인증 코드: ${code}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "[Quri] 이메일 인증 코드",
      text: `Quri 회원가입 인증 코드는 ${code} 입니다. 10분 안에 입력해 주세요.`,
      html: this.renderHtml(code),
    });
    this.logger.log(`인증 코드 메일 발송 완료: ${to}`);
  }

  private renderHtml(code: string): string {
    return `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 8px;">Quri 이메일 인증</h2>
        <p style="color:#555;margin:0 0 24px;">아래 6자리 코드를 입력해 회원가입을 완료해 주세요.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:12px;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;margin:24px 0 0;">이 코드는 10분 후 만료됩니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
      </div>
    `;
  }
}
