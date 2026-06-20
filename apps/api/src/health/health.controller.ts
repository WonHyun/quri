import { Controller, Get } from "@nestjs/common";

@Controller("api/healthz")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", uptime: process.uptime() };
  }
}
