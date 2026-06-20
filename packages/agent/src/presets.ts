import { z } from "zod";
import {
  DEFAULT_CHOICE_COUNT,
  DIFFICULTIES,
  MAX_CHOICE_COUNT,
  MAX_QUESTION_COUNT,
  MIN_CHOICE_COUNT,
  MIN_QUESTION_COUNT,
} from "./schema";

/**
 * 시험별 프리셋 카탈로그 (단일 출처).
 *
 * 프리셋은 자유주제 입력을 대체하지 않고 "보강"한다. 사용자가 프리셋을 고르면
 * 해당 시험에 맞는 promptHints 가 에이전트 프롬프트에 주입되어 출제 품질을 높인다.
 * api/web 양쪽이 이 카탈로그를 단일 출처로 사용한다(웹은 GET /api/presets 로 수신).
 */
export const ExamPresetSchema = z.object({
  /** URL-safe 식별자 (요청/저장 키) */
  slug: z.string().min(1),
  /** 표시용 시험명 */
  name: z.string().min(1),
  /** UI 그룹핑용 카테고리 */
  category: z.string().min(1),
  /** 한 줄 소개 */
  blurb: z.string().min(1),
  /** 프리셋 선택 시 자유주제 입력칸을 채울 기본 표시값 */
  defaultTopic: z.string().min(1),
  /** 과목/영역 (선택적으로 출제 범위를 좁히는 데 사용) */
  subjects: z.array(z.string().min(1)).default([]),
  /** 프리셋 선택 시 자동 설정되는 기본 문항 수 */
  defaultCount: z
    .number()
    .int()
    .min(MIN_QUESTION_COUNT)
    .max(MAX_QUESTION_COUNT)
    .default(10),
  /** 프리셋 선택 시 자동 설정되는 문항당 선지 수 */
  defaultChoiceCount: z
    .number()
    .int()
    .min(MIN_CHOICE_COUNT)
    .max(MAX_CHOICE_COUNT)
    .default(DEFAULT_CHOICE_COUNT),
  /** 프리셋 선택 시 자동 설정되는 난이도 */
  defaultDifficulty: z.enum(DIFFICULTIES).default("medium"),
  /** 프롬프트에 주입되는 시험 특화 출제 지시 */
  promptHints: z.array(z.string().min(1)).min(1),
});

export type ExamPreset = z.infer<typeof ExamPresetSchema>;

export const EXAM_PRESETS: readonly ExamPreset[] = [
  {
    slug: "sqld",
    name: "SQLD (SQL 개발자)",
    category: "데이터베이스",
    blurb: "데이터 모델링의 이해와 SQL 활용 능력을 검정하는 국가공인 자격",
    defaultTopic: "SQLD 자격시험",
    subjects: ["데이터 모델링의 이해", "SQL 기본 및 활용"],
    defaultCount: 50,
    defaultChoiceCount: 5,
    defaultDifficulty: "medium",
    promptHints: [
      "한국데이터산업진흥원(KDATA) SQLD 출제 범위와 난이도에 맞춰 출제하라.",
      "데이터 모델링(엔터티/속성/관계, 식별자, 정규화/반정규화)과 SQL 기본/활용(DDL·DML·TCL, 조인, 서브쿼리, 집계·그룹 함수, 윈도우 함수)을 균형 있게 다뤄라.",
      "실제 기출 유형처럼 SQL 실행 결과 예측, 옳고 그름 판별형 문항을 포함하고, 그럴듯한 함정 선지를 넣되 정답은 명확히 하나만 두어라.",
    ],
  },
  {
    slug: "engineer-information-processing",
    name: "정보처리기사 (필기)",
    category: "국가기술자격 / IT",
    blurb: "소프트웨어 설계·개발·데이터베이스·프로그래밍·정보시스템 관리 전반",
    defaultTopic: "정보처리기사 필기",
    subjects: [
      "소프트웨어 설계",
      "소프트웨어 개발",
      "데이터베이스 구축",
      "프로그래밍 언어 활용",
      "정보시스템 구축관리",
    ],
    defaultCount: 100,
    defaultChoiceCount: 4,
    defaultDifficulty: "medium",
    promptHints: [
      "한국산업인력공단(Q-Net) 정보처리기사 필기 5과목 출제기준에 맞춰 출제하라.",
      "요구사항/설계 모델링(UML, 디자인 패턴), 자료구조·알고리즘, 데이터베이스(SQL·정규화·트랜잭션), 프로그래밍(C·Java·Python 기초 문법과 실행 결과), 네트워크·보안·운영체제 개념을 다뤄라.",
      "실제 기출처럼 용어 정의, 개념 비교, 코드 실행 결과 예측 유형을 섞고, 정답은 명확히 하나만 두어라.",
    ],
  },
  {
    slug: "engineer-information-security",
    name: "정보보안기사",
    category: "국가기술자격 / 보안",
    blurb: "시스템·네트워크·애플리케이션 보안과 정보보안 관리·법규",
    defaultTopic: "정보보안기사",
    subjects: [
      "시스템 보안",
      "네트워크 보안",
      "애플리케이션 보안",
      "정보보안 일반",
      "정보보안 관리 및 법규",
    ],
    defaultCount: 100,
    defaultChoiceCount: 4,
    defaultDifficulty: "hard",
    promptHints: [
      "정보보안기사 필기 출제 범위와 실무 난이도에 맞춰 출제하라.",
      "암호학(대칭·공개키·해시), 접근통제, 시스템/네트워크 보안(방화벽·IDS·VPN·프로토콜 취약점), 웹·애플리케이션 보안(OWASP), 정보보호 관리체계(ISMS-P)와 관련 법규를 다뤄라.",
      "공격 기법과 대응책을 짝짓는 유형, 보안 개념 비교 유형을 포함하고, 정답은 명확히 하나만 두어라.",
    ],
  },
  {
    slug: "korean-history",
    name: "한국사능력검정시험 (심화)",
    category: "국가공인 / 한국사",
    blurb: "선사시대부터 현대까지 한국사 전 시대의 흐름과 핵심 사건",
    defaultTopic: "한국사능력검정시험 심화",
    subjects: [
      "선사·고대",
      "고려",
      "조선",
      "근대",
      "일제강점기",
      "현대",
    ],
    defaultCount: 50,
    defaultChoiceCount: 5,
    defaultDifficulty: "hard",
    promptHints: [
      "국사편찬위원회 한국사능력검정시험 '심화' 등급 난이도에 맞춰 출제하라.",
      "시대별 핵심 사건·인물·제도·문화재를 다루고, 자료(사료·연표·지도) 해석형 문항의 취지를 반영하라.",
      "사건의 선후 관계와 시대 구분을 묻는 유형을 포함하고, 정답은 명확히 하나만 두어라.",
    ],
  },
  {
    slug: "adsp",
    name: "ADsP (데이터분석 준전문가)",
    category: "데이터베이스 / 분석",
    blurb: "데이터 이해, 데이터 분석 기획, 데이터 분석 기법의 기초",
    defaultTopic: "ADsP 데이터분석 준전문가",
    subjects: ["데이터 이해", "데이터 분석 기획", "데이터 분석"],
    defaultCount: 50,
    defaultChoiceCount: 4,
    defaultDifficulty: "medium",
    promptHints: [
      "한국데이터산업진흥원(KDATA) ADsP 출제 범위와 난이도에 맞춰 출제하라.",
      "데이터와 정보의 이해, 데이터베이스/빅데이터 개념, 분석 기획과 방법론, 통계 기초와 R 기반 데이터 분석(데이터 전처리, 통계분석, 정형 데이터 마이닝)을 다뤄라.",
      "개념 정의·비교 유형과 통계 해석 유형을 섞고, 정답은 명확히 하나만 두어라.",
    ],
  },
  {
    slug: "linux-master-2",
    name: "리눅스마스터 2급",
    category: "국가공인 / IT",
    blurb: "리눅스 운영·관리 기초와 네트워크·시스템 활용",
    defaultTopic: "리눅스마스터 2급",
    subjects: [
      "리눅스 운영 및 관리",
      "리눅스 활용",
      "네트워크 및 서비스의 활용",
    ],
    defaultCount: 100,
    defaultChoiceCount: 4,
    defaultDifficulty: "easy",
    promptHints: [
      "한국정보통신진흥협회(KAIT) 리눅스마스터 2급 출제 범위와 난이도에 맞춰 출제하라.",
      "리눅스 기본 명령어, 파일·권한 관리, 셸과 프로세스, 패키지·계정 관리, 네트워크 설정과 주요 서비스(데몬) 개념을 다뤄라.",
      "명령어 옵션·결과 예측 유형과 개념 비교 유형을 포함하고, 정답은 명확히 하나만 두어라.",
    ],
  },
] as const;

/** slug 로 프리셋을 찾는다. 없으면 undefined. */
export function findPreset(slug: string): ExamPreset | undefined {
  return EXAM_PRESETS.find((p) => p.slug === slug);
}

/** 유효한 프리셋 slug 목록 (검증용 단일 출처). */
export const EXAM_PRESET_SLUGS = EXAM_PRESETS.map((p) => p.slug);
