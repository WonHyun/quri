# Quri — Product Requirements Document (PRD)

> **궁금한 모든 주제를, 퀴즈로.**
> 주제만 입력하면 **GitHub Copilot**이 객관식 문제를 생성하고, 풀이·채점·해설·통계까지 이어지는 **AI 기반 개인 학습 생산성 웹 앱**.

- **제품명**: Quri (quiz + curiosity)
- **카테고리**: 개인 생산성 향상 웹 앱 (Personal Learning & Productivity)
- **핵심 가치**: "배우고 싶은 주제 → 즉시 나만의 문제은행 → 반복 학습 → 약점 데이터화"의 학습 루프를 자동화
- **상태**: 로컬 + Azure 운영 배포까지 동작하는 풀스택 모노레포

---

## 1. 평가용 빠른 시작 — 게스트 모드 (중요)

> 🟢 **이 제품은 가입 없이 즉시 전체 기능을 체험할 수 있는 "게스트 모드"를 제공합니다.**
> AI/평가자가 **이메일·비밀번호·인증코드 없이** 실제 동작을 끝까지 검증할 수 있도록 설계했습니다.

- 로그인 화면의 **`👋 게스트로 둘러보기`** 버튼 한 번이면 임시 계정이 발급되어 바로 시작합니다.
- API: `POST /api/auth/guest` → JWT 즉시 발급 (`isGuest: true`).
- 게스트도 **정식 사용자와 동일한 전체 기능**(문제 생성·풀이·채점·해설·대시보드)을 그대로 사용합니다.
- 게스트 계정과 데이터는 **7일 TTL**로 자동 정리되어(`@Cron` 매일 자정), 평가용 임시 데이터가 운영을 오염시키지 않습니다.

**평가 권장 시나리오 (게스트 모드 기준)**

1. `게스트로 둘러보기` 클릭 → 즉시 입장
2. 주제 입력(또는 🎲 랜덤) 후 문제 생성 요청 → 백그라운드 작업으로 처리(앱은 계속 조작 가능)
3. 생성 완료된 퀴즈 풀이 → 제출 → 자동 채점 + 문항별 해설 확인
4. 개인 대시보드에서 평균 정답률·주제별 통계 확인

---

## 2. 문제 정의 & 목표

### 해결하려는 문제

- 시험·자격증·관심 주제를 공부할 때, **양질의 연습 문제를 직접 만들거나 찾는 비용**이 크다.
- 기존 문제집은 **내 관심 주제·난이도·분량에 맞춤화되지 않는다.**
- 풀이 결과가 **데이터로 축적되지 않아** 약점 파악과 반복 학습이 어렵다.

### 목표 (생산성 관점)

1. **즉시성**: 주제 입력 → 수 초~수십 초 내 나만의 문제은행 확보.
2. **맞춤화**: 자유 주제 + 시험 프리셋으로 문항 수·선지 수·난이도까지 자동 최적화.
3. **반복성**: 생성된 문제는 DB에 영구 저장되어 언제든 다시 풀이.
4. **측정 가능성**: 풀이 기록을 집계해 개인 대시보드로 학습 성과를 시각화.

---

## 3. 핵심 기능 (Features)

### 3.1 AI 퀴즈 생성 (핵심 차별점)

- 주제 한 줄이면 **GitHub Copilot**이 한국어 객관식 문제(문항/선지/정답/해설)를 생성.
- 선지 수 **2~5지선다**, 난이도, 문항 수(최대 100문항)까지 사용자가 제어.
- **🎲 랜덤 주제** 제공으로 학습 시작 장벽 제거.

### 3.2 시험 프리셋 (자격증 대비)

- SQLD·정보처리기사·정보보안기사·한국사능력검정·ADsP·리눅스마스터 2급 등 프리셋 제공.
- 프리셋 선택 시 **출제 경향 지침(promptHints)** 이 프롬프트에 주입되어 출제 품질 향상.
- 실제 시험 규모에 맞춰 **문항 수·선지 수·난이도가 자동 설정**(이후 수동 조정 가능).
- 카탈로그는 `packages/agent/src/presets.ts` **단일 출처(zod 검증)** 로 API/웹이 공유.

### 3.3 풀이 · 채점 · 해설

- 정답을 숨긴 상태로 문제 제공 → 제출 시 자동 채점.
- 문항별 **정오답 + 해설** 즉시 확인.
- 풀이 1회는 `QuizAttempt`로, 문항 응답은 `AnswerRecord`로 기록.

### 3.4 개인 대시보드 (생산성 측정)

- 만든 퀴즈 수, 총 시도 수, 평균 정답률, **주제별 정답률** 집계.
- 학습 성과를 데이터로 가시화해 약점 영역 파악 지원.

### 3.5 인증 & 멀티유저

- 이메일+비밀번호(bcrypt) 회원가입, **이메일 인증코드** 검증, JWT 발급.
- **게스트 모드**로 무가입 즉시 체험(2.절 참고).
- 도메인을 **User/Auth · Quiz(콘텐츠) · Ownership(소유권) · Attempts(기록) · Dashboard**로 분리.

---

## 4. 아키텍처 & 기술 스택

| 영역         | 기술                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| 백엔드       | **NestJS** + **Prisma** (REST API + React 번들 정적 서빙)                           |
| 프론트엔드   | **React + Vite** (라이트/다크 듀얼 테마 "Spark")                                    |
| AI 엔진      | `packages/agent` → **GitHub Copilot** 비대화 모드 호출 + **zod** 스키마 검증        |
| 데이터베이스 | **PostgreSQL** (로컬: Docker / 운영: Azure Database for PostgreSQL Flexible Server) |
| 배포         | **Azure App Service** (Linux) + **azd** + GitHub Actions CI/CD                      |

```
apps/
  api/        # NestJS — REST API + 정적 서빙 + 도메인 모듈
  web/        # React + Vite 프론트엔드
packages/
  agent/      # GitHub Copilot 기반 퀴즈 생성기 (@quri/agent)
infra/        # Azure Bicep (App Service + PostgreSQL)
azure.yaml    # azd 서비스 맵
```

> **모노레포 + 워크스페이스**: `@quri/*` npm 스코프로 패키지를 분리해 빌드 순서(agent → web → api)와 의존성을 명확히 관리.

---

## 5. GitHub Copilot 활용 (AI 강점)

> **Quri의 핵심 엔진은 GitHub Copilot입니다.** 단순 호출이 아니라 **신뢰성·확장성·검증**을 갖춘 프로덕션급 통합입니다.

- **전용 에이전트 패키지**: `packages/agent`의 `CopilotAgent`가 Copilot을 비대화 모드(`-p ... --output JSON`)로 구동하고 재사용 가능한 SDK 형태로 캡슐화.
- **스키마 강제 검증**: Copilot 출력(JSON 배열)을 **zod 스키마로 검증**해 문항/선지/정답/해설 구조 불일치를 차단. 파싱 실패 시 명확한 에러로 전환.
- **균형 괄호 파서**: 응답 텍스트에서 JSON 배열만 안전하게 추출(`extractJsonArray`)해, 부가 텍스트가 섞여도 견고하게 동작.
- **대량 생성 안정화**: 100문항도 **배치 분할(기본 10문항/호출) + 제한된 동시성(기본 2)** 으로 처리해 단일 호출 타임아웃·실패 위험을 낮춤(`splitIntoBatches`, `runWithConcurrency`).
- **튜닝 가능**: `COPILOT_BATCH_SIZE`, `COPILOT_CONCURRENCY`, `COPILOT_TIMEOUT_MS`, `COPILOT_MODEL` 환경 변수로 운영 조정.
- **운영 환경 인증 자동화**: 배포 번들에 Copilot 바이너리를 포함하고 `COPILOT_BIN`/`COPILOT_GITHUB_TOKEN`을 주입해 **클라우드에서도 AI 생성이 동작**.

---

## 6. Azure 클라우드 활용 (운영 강점)

> **로컬에서만 돌아가는 데모가 아니라, Azure에 실제 배포·운영되는 풀스택 서비스입니다.**

- **IaC(Bicep)**: `infra/main.bicep`이 App Service Plan + Web App + **PostgreSQL Flexible Server** + 방화벽 규칙을 코드로 프로비저닝. 재현 가능하고 버전 관리됨.
- **azd 원클릭 배포**: `azd up` 한 번으로 인프라 + 앱 배포.
- **GitHub Actions CI/CD**: `main` 푸시 시 web+api를 빌드해 단일 App Service로 자동 배포.
- **시크릿 분리**: `JWT_SECRET`·DB 비밀번호·SMTP·Copilot 토큰을 **App Service 앱 설정(환경변수)으로 주입**, `.env`는 클라우드에 올리지 않음.
- **헬스 체크**: App Service `healthCheckPath: /api/healthz`로 가용성 모니터링.
- **HTTPS 강제** + PostgreSQL `sslmode=require`로 전송 구간 보안.
- **비용 합리화**: Burstable B1ms 등 **가장 저렴한 유료 조합**으로 구성.

---

## 7. 안정성 · 품질 (Engineering Quality)

이 프로젝트가 "잘 처리된" 부분 — 평가 시 강점으로 어필할 수 있는 항목:

- **비동기 작업 큐로 블로킹 제거**: 문제 생성(수십 초~수 분)을 `POST /api/quizzes`가 즉시 **job(202)** 으로 반환하고 백그라운드 처리. 사용자는 **기다리는 동안에도 다른 퀴즈 풀이·앱 조작 가능**. 상태(`pending`/`running`/`ready`/`failed`)는 폴링으로 추적.
- **장애 격리**: 진행 중 작업만 서버 재시작 시 유실되고, **이미 저장된 퀴즈/풀이는 보존**. 완료/실패 작업은 자동 정리.
- **AI 출력 신뢰성**: zod 스키마 검증으로 잘못된 AI 출력이 DB·채점 로직에 유입되지 않음.
- **보안 기본기**:
  - 비밀번호 **bcrypt 해싱**, 인증 코드 해시 저장 + 시도 횟수 제한.
  - **레이트 리미팅**: 인증/회원가입 엔드포인트 IP별 분당 5회로 무차별 대입·메일 폭탄 방지.
  - JWT 기반 인증, 모든 `/api/quizzes`·`/api/me`·`/api/dashboard` 보호.
- **도메인 주도 설계**: 콘텐츠와 소유권을 분리(`Quiz` vs `QuizOwnership`)해, **데이터 모델 변경 없이** 퀴즈 공개(PUBLIC)·공유로 확장 가능.
- **데이터 정합성**: Prisma 스키마에 인덱스·`onDelete: Cascade`·트랜잭션 적용(게스트 정리 등).
- **테스트**: `packages/agent`(스키마·Copilot 파서)와 `apps/api`에 단위 테스트 존재(`npm run test`).
- **타입 안전 + 린트**: 모노레포 전반 TypeScript, `npm run lint`로 일관성 검증.
- **그레이스풀 디그레이드**: AI 토큰/Copilot이 없어도 **이미 저장된 문제 풀이·조회·채점은 그대로 동작**.

---

## 8. API 요약

### 인증

| 메서드 | 경로                      | 설명                               |
| ------ | ------------------------- | ---------------------------------- |
| POST   | `/api/auth/signup`        | 회원가입 → 인증코드 메일 발송      |
| POST   | `/api/auth/signup/verify` | 코드 검증 → 계정 생성 + JWT        |
| POST   | `/api/auth/signup/resend` | 인증코드 재발송                    |
| POST   | `/api/auth/login`         | 로그인 + JWT                       |
| POST   | `/api/auth/guest`         | **게스트 즉시 시작 (가입 불필요)** |
| GET    | `/api/auth/me`            | 현재 사용자 정보                   |

### 퀴즈 / 기록 / 대시보드

| 메서드 | 경로                                    | 설명                              |
| ------ | --------------------------------------- | --------------------------------- |
| POST   | `/api/quizzes`                          | 생성 작업 큐잉(202, 백그라운드)   |
| GET    | `/api/quizzes` · `/api/quizzes/:id`     | 내 퀴즈 목록 / 단일(정답 숨김)    |
| POST   | `/api/quizzes/:id/submit`               | 채점 + 시도 기록                  |
| GET    | `/api/quiz-jobs` · `/api/quiz-jobs/:id` | 생성 작업 상태 폴링               |
| GET    | `/api/me/attempts`                      | 내 풀이 기록                      |
| GET    | `/api/dashboard/stats`                  | 개인 대시보드 집계                |
| GET    | `/api/presets`                          | 시험 프리셋 카탈로그(인증 불필요) |

---

## 9. 데이터 모델 (요약)

- **User** — 이메일/비밀번호/표시명/`isGuest`/`emailVerified`.
- **EmailVerification** — 보류 중인 가입 요청(이메일당 1건, 검증 시 User로 승격).
- **Quiz / Question** — 퀴즈 콘텐츠(소유 정보 미보유), 문항/선지(Json)/정답/해설.
- **QuizOwnership** — 유저↔퀴즈 소유 + 가시성(`PRIVATE`/`PUBLIC`).
- **QuizAttempt / AnswerRecord** — 풀이 시도와 문항별 응답(대시보드 집계 소스).

---

## 10. 비기능 요구사항 (NFR)

- **성능**: 대량 문항 생성을 배치+동시성으로 처리, 사용자 체감 블로킹 제거.
- **가용성**: App Service 헬스 체크, 저장된 데이터는 AI 의존 없이 동작.
- **보안**: bcrypt, JWT, 레이트 리미팅, HTTPS/SSL, 시크릿 환경변수 분리.
- **확장성**: 도메인 분리 설계로 퀴즈 공유·약점 분석 등 확장 용이.
- **유지보수성**: 모노레포 + 타입/스키마 검증 + 단위 테스트 + IaC.

---

## 11. 평가 체크리스트 (요약)

- [x] **가입 없이 게스트 모드로 전 기능 즉시 검증 가능** (`👋 게스트로 둘러보기`)
- [x] **GitHub Copilot** 기반 실시간 AI 문제 생성 + zod 검증
- [x] **Azure** App Service + PostgreSQL, Bicep IaC + azd + GitHub Actions CI/CD
- [x] 비동기 작업 큐로 끊김 없는 UX, 장애 격리, 데이터 보존
- [x] 보안(bcrypt·JWT·레이트리밋·HTTPS) 및 도메인 분리 아키텍처
- [x] 개인 대시보드로 학습 성과를 데이터로 측정 (생산성 가치 입증)
