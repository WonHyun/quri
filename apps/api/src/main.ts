import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // SPA(정적 번들)를 동일 출처에서 서빙하므로 CSP 는 비활성화하고
  // 나머지 보안 헤더(HSTS, X-Content-Type-Options 등)는 적용한다.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  // 운영에선 단일 App Service가 API+정적 번들을 동일 출처로 서빙하므로 CORS 불필요.
  if (process.env.NODE_ENV !== "production") {
    app.enableCors();
  }
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`quri API listening on http://localhost:${port}`);
}

void bootstrap();
