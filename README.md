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
| POST   | `/api/quizzes`            | `{ topic, count?, difficulty?, choiceCount?, presetSlug?, subject? }` → 생성 작업을 큐에 넣고 작업 정보 반환(202, 백그라운드 생성) |
| GET    | `/api/quizzes`            | 내가 소유한 퀴즈 목록                                           |
| GET    | `/api/quizzes/:id`        | 단일 퀴즈 (소유자/공개일 때만, 정답 숨김)                       |
| POST   | `/api/quizzes/:id/submit` | `{ answers: [...] }` → 채점 + 유저 단위 시도 기록               |
| GET    | `/api/quiz-jobs`          | 내 생성 작업 목록(상태 폴링)                                    |
| GET    | `/api/quiz-jobs/:id`      | 단일 생성 작업 상태(`pending`/`running`/`ready`/`failed`)       |
| DELETE | `/api/quiz-jobs/:id`      | 완료/실패한 작업을 목록에서 제거                                |
| GET    | `/api/me/attempts`        | 내 풀이 시도 목록                                               |
| GET    | `/api/dashboard/stats`    | 개인 대시보드 집계(만든 퀴즈·총 시도·평균 정답률·주제별 정답률) |
| GET    | `/api/presets`            | 시험 프리셋 카탈로그(인증 불필요, 정적 데이터)                  |

### 비동기 생성 (백그라운드 작업)

문제 생성(Copilot 호출)은 수십 초~수 분 걸릴 수 있어 요청을 블로킹하지 않습니다.
`POST /api/quizzes`는 즉시 **생성 작업(job)** 을 반환하고, 실제 생성은 백그라운드에서
진행됩니다. 웹은 `GET /api/quiz-jobs`로 상태를 폴링하므로, **생성을 기다리는 동안에도
다른 퀴즈를 풀거나 앱을 자유롭게 조작**할 수 있습니다. 완료되면 ‘생성 작업’ 패널과
‘내 퀴즈’ 목록에 나타나 바로 풀 수 있습니다.

- 작업 레지스트리는 인메모리이며 진행 상태 추적 용도입니다(서버 재시작 시 진행 중 작업만
  유실되고, 이미 저장된 퀴즈는 보존). 완료/실패 작업은 일정 시간 후 자동 정리됩니다.
- 대량 문항은 `packages/agent`가 Copilot 호출을 **배치로 분할**(기본 10문항/호출)해
  제한된 동시성(기본 2)으로 실행하고 결과를 병합합니다. 단일 호출의 타임아웃·실패 위험을
  낮춰 100문항까지 안정적으로 생성합니다.
- 관련 환경 변수: `COPILOT_BATCH_SIZE`(배치 크기), `COPILOT_CONCURRENCY`(동시 배치 수),
  `COPILOT_TIMEOUT_MS`(호출당 타임아웃).

### 시험 프리셋 (자격증 대비)

자유 주제 입력은 그대로 유지하면서, **시험별 프리셋**을 보조 옵션으로 제공합니다.
SQLD·정보처리기사·정보보안기사·한국사능력검정시험·ADsP·리눅스마스터 2급 등을 고르면,
해당 시험의 출제 경향을 담은 지침(`promptHints`)이 Copilot 프롬프트에 주입되어 출제 품질을 높입니다.

- 카탈로그 단일 출처: `packages/agent/src/presets.ts` (zod 검증). API/웹이 공유합니다.
- 프리셋을 고르면 시험 출제 경향에 맞춰 **문항 수·선지 수·난이도가 자동으로 설정**됩니다(이후 수동 조정 가능). 문항 수는 실제 시험 규모(SQLD·한국사·ADsP 50문항, 정보처리·정보보안·리눅스마스터 100문항)에 맞춰지며, 직접 생성은 최대 100문항까지 지원합니다.
- 요청 시 `presetSlug`(+선택 `subject`)를 보내면 해당 지침/과목 범위가 반영되고,
  저장·표시용 `topic`은 시험명에서 파생됩니다. 프리셋 미사용 시 기존 자유 주제 흐름과 동일하게 동작합니다.
- 출력 JSON 스키마(문항/선지/정답/해설)는 불변이라 채점·저장 로직에 영향이 없습니다.
- 프리셋 추가는 카탈로그 데이터에 항목만 더하면 됩니다.

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
>
> 회원가입 인증 메일을 운영에서 쓰려면 SMTP 변수도 설정하세요(미설정 시 코드는 서버 로그로만 출력):
> ```bash
> azd env set MAIL_USERNAME "your-account@gmail.com"
> azd env set MAIL_PASSWORD "<gmail-app-password>"   # 앱 비밀번호
> azd env set MAIL_FROM "Quri <your-account@gmail.com>"
> ```
> 이 값들은 `infra/main.bicep`이 App Service 애플리케이션 설정(환경변수)으로 주입합니다. `.env` 파일은 클라우드에 올리지 않습니다.

`.github/workflows/azure-deploy.yml`이 `main` 푸시 시 web+api를 빌드해 단일 App Service로 배포합니다.
필요 시크릿: `AZURE_WEBAPP_PUBLISH_PROFILE`, `AZURE_WEBAPP_NAME`.

> ✅ **Copilot 인증(운영)**: 배포 파이프라인이 GitHub Copilot CLI(`@github/copilot`의 linux-x64
> 바이너리)를 배포 번들에 포함하고, App Service 설정 `COPILOT_BIN`이 해당 바이너리를 직접 가리키도록
> 구성되어 운영 환경에서도 문제 생성이 동작합니다. 헤드리스 인증 토큰은 `COPILOT_GITHUB_TOKEN`으로
> 주입합니다(GitHub OAuth `gho_` 토큰 또는 "Copilot Requests" 권한의 fine-grained PAT; 클래식 `ghp_`는 미지원).
>
> ```bash
> # 권장: 최소 권한 fine-grained PAT("Copilot Requests") 사용. 임시로 gh OAuth 토큰도 가능.
> azd env set COPILOT_GITHUB_TOKEN "<gho_ 또는 fine-grained PAT>"
> ```
> 토큰은 `infra/main.bicep`이 App Service 환경변수로 주입합니다. zip 배포가 실행권한/심링크를 제거하므로,
> 시작 명령에서 바이너리에 `chmod +x`를 수행한 뒤 앱을 기동합니다.
> (이미 DB에 저장된 문제 풀이/조회/채점은 Copilot 없이도 동작합니다.)

## 동작 원리 — Copilot 연동

`packages/agent/src/copilot.ts`는 `copilot -p "<프롬프트>" -s --allow-all-tools --output JSON`을
비대화 모드로 실행하고, 응답에서 JSON 배열을 추출해 **zod 스키마로 검증**합니다.
스키마 불일치/파싱 실패 시 명확한 에러를 던지며, 백그라운드 생성 작업에서는 이 에러가
작업 상태(`failed`)와 메시지로 기록되어 ‘생성 작업’ 패널에 표시됩니다.
