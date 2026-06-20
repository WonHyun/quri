import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";

/** 메일 발송 도메인 — Gmail SMTP 기반 인증 메일 전송. */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
