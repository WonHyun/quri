<div align="center">
  <img src="apps/web/public/favicon.svg" width="72" alt="Quri" />

  # Quri

  **궁금한 모든 주제를, 퀴즈로.**
</div>

주제를 입력하면 **GitHub Copilot**이 객관식 4지선다 문제를 생성하고, 풀이·채점·해설을 제공하는 AI 학습 퀴즈 서비스입니다. 생성된 문제는 데이터베이스에 저장되어 언제든 다시 풀어볼 수 있습니다.

> **브랜드** — 제품명은 **Quri**(quiz + curiosity)이며, 디자인 언어는 인디고→바이올렛 그라데이션과 앰버 스파크 액센트를 쓰는 **“Spark”**(라이트/다크 듀얼 테마)입니다. 모노레포 내부 npm 패키지 스코프는 `@quri/*`를 사용합니다.

## 스택

| 영역         | 기술                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| 백엔드       | NestJS + Prisma                                                                 |
| 프론트엔드   | React + Vite                                                                    |
| AI 문제 생성 | `packages/agent` → Copilot CLI(`copilot -p`) + zod 검증                         |
| 데이터베이스 | PostgreSQL (로컬: Docker / 운영: Azure Database for PostgreSQL Flexible Server) |
| 배포         | Azure App Service (Linux, B1 Basic — 유료) — NestJS가 React 번들을 정적 서빙   |

## 구조

```
apps/
  api/        # NestJS 서비스 (REST API + 정적 서빙)
  web/        # React + Vite 프론트엔드
packages/
  agent/      # Copilot 기반 퀴즈 생성기 (@quri/agent)
infra/        # Azure Bicep 템플릿
azure.yaml    # azd 서비스 맵
docker-compose.yml  # 로컬 PostgreSQL
```

## 사전 준비

- Node.js 22+ (`.nvmrc`)
- Docker (로컬 PostgreSQL)
- **GitHub Copilot CLI** 설치 및 로그인 — 문제 생성에 필수
  ```bash
  npm i -g @github/copilot   # 또는 brew install copilot
  copilot            # 최초 1회 로그인
  ```
  `copilot` 바이너리가 PATH에 있고 인증되어 있어야 합니다.

## 로컬 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수
cp .env.example .env

# 3) PostgreSQL 기동
npm run db:up

# 4) DB 스키마 생성 (apps/api 에서 실행)
cd apps/api
export DATABASE_URL="postgresql://quri:quri@localhost:5432/quri?schema=public"
npx prisma migrate dev
cd ../..

# 5) 개발 서버 (API:3000, Web:5173)
npm run dev
```

브라우저에서 http://localhost:5173 접속 → 주제 입력(또는 🎲 랜덤) → 문제 생성 → 풀이 → 채점/해설.

> 문제 생성은 Copilot 호출이라 수 초~수십 초 걸릴 수 있습니다.

## API

모든 `/api/quizzes`·`/api/me`·`/api/dashboard` 엔드포인트는 인증이 필요합니다(`Authorization: Bearer <JWT>`).

### 인증

| 메서드 | 경로                      | 설명                                                              |
| ------ | ------------------------- | ----------------------------------------------------------------- |
| POST   | `/api/auth/signup`        | `{ email, password, displayName? }` → 인증 코드 이메일 발송       |
| POST   | `/api/auth/signup/verify` | `{ email, code }` → 코드 검증 후 계정 생성 + JWT 발급             |
| POST   | `/api/auth/signup/resend` | `{ email }` → 인증 코드 재발송                                    |
| POST   | `/api/auth/login`         | `{ email, password }` → 로그인 + JWT 발급                         |
| GET    | `/api/auth/me`            | 현재 로그인 사용자 정보                                           |

> 인증·회원가입 엔드포인트는 무차별 대입/메일 폭탄 방지를 위해 IP별 분당 5회로 제한됩니다.

### 퀴즈 / 기록 / 대시보드

| 메서드 | 경로                      | 설명                                                            |
| ------ | ------------------------- | --------------------------------------------------------------- |
| POST   | `/api/quizzes`            | `{ topic, count?, difficulty? }` → 문제 생성·저장 + 소유권 부여 |
| GET    | `/api/quizzes`            | 내가 소유한 퀴즈 목록                                           |
| GET    | `/api/quizzes/:id`        | 단일 퀴즈 (소유자/공개일 때만, 정답 숨김)                       |
| POST   | `/api/quizzes/:id/submit` | `{ answers: [...] }` → 채점 + 유저 단위 시도 기록               |
| GET    | `/api/me/attempts`        | 내 풀이 시도 목록                                               |
| GET    | `/api/dashboard/stats`    | 개인 대시보드 집계(만든 퀴즈·총 시도·평균 정답률·주제별 정답률) |

## 도메인 구조 (멀티유저)

로그인 없는 단일 사용자에서, 이메일 기반 멀티유저로 전환되었습니다. 책임을 도메인 모듈로 분리합니다.

- **User / Auth** (`users/`, `auth/`) — 이메일+비밀번호(bcrypt) 회원가입/로그인, JWT 인증.
- **Quiz (콘텐츠)** (`quiz/`) — 퀴즈/문항 콘텐츠. 유저·소유 정보를 직접 갖지 않음.
- **Ownership (소유권)** (`ownership/`) — 유저↔퀴즈 소유 관계와 가시성(`PRIVATE`/`PUBLIC`). 향후 한 퀴즈를 다른 유저에게 노출하는 확장의 단일 지점.
- **Attempts (기록)** (`attempts/`) — 유저별 풀이 시도(`QuizAttempt`)와 문항 응답(`AnswerRecord`).
- **Dashboard** (`dashboard/`) — 기록을 집계하는 개인 대시보드. 기간/약점 분석 등으로 확장 예정.

퀴즈 콘텐츠와 소유권을 분리했기 때문에, 동일 퀴즈를 소유자 외 유저에게 `PUBLIC`으로 공개하는 기능을 데이터 모델 변경 없이 얹을 수 있습니다.

## 빌드 / 검증

```bash
npm run build   # agent → web → api 순서로 빌드
npm run lint
```

## Azure 배포

`infra/main.bicep`은 App Service(**B1 Basic, 유료**) + PostgreSQL Flexible Server(**B1ms, 유료**)를 프로비저닝합니다.
PostgreSQL이 필요해 완전 무료(F1)로는 구성되지 않습니다. 가장 저렴한 유료 조합으로 맞춰져 있습니다.

```bash
azd up   # 로그인되어 있다고 가정
```

> `azd` 환경 변수로 `DB_ADMIN_PASSWORD`와 `JWT_SECRET`(강력한 무작위 값)을 설정해야 합니다.
> 예: `azd env set JWT_SECRET "$(openssl rand -base64 48)"`

`.github/workflows/azure-deploy.yml`이 `main` 푸시 시 web+api를 빌드해 단일 App Service로 배포합니다.
필요 시크릿: `AZURE_WEBAPP_PUBLISH_PROFILE`, `AZURE_WEBAPP_NAME`.

> ⚠️ **Copilot 인증 주의**: 문제 생성은 호스트에 `copilot` CLI가 설치·인증되어 있어야 동작합니다.
> Azure App Service에는 기본 제공되지 않으므로, 운영 환경에서 생성 기능을 쓰려면 CLI 설치 및 GitHub 인증 토큰 주입이 별도로 필요합니다.
> (이미 DB에 저장된 문제 풀이/조회/채점은 Copilot 없이도 동작합니다.)

## 동작 원리 — Copilot 연동

`packages/agent/src/copilot.ts`는 `copilot -p "<프롬프트>" -s --allow-all-tools --output JSON`을
비대화 모드로 실행하고, 응답에서 JSON 배열을 추출해 **zod 스키마로 검증**합니다.
스키마 불일치/파싱 실패 시 명확한 에러를 던져 API가 502로 변환합니다.
