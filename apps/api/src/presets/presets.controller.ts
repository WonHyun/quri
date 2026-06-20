import { Controller, Get } from "@nestjs/common";
import { EXAM_PRESETS } from "@quri/agent";

/**
 * 시험 프리셋 카탈로그를 노출한다(정적 데이터, 인증 불필요).
 * 웹 프리셋 피커가 이 목록으로 칩/과목을 렌더링한다.
 * 출제 지침(promptHints)은 서버 내부에서만 쓰므로 응답에서 제외한다.
 */
@Controller("api/presets")
export class PresetsController {
  @Get()
  list() {
    // promptHints 는 서버 내부 출제 지침이므로 응답에서 제외한다.
    return EXAM_PRESETS.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      blurb: p.blurb,
      defaultTopic: p.defaultTopic,
      subjects: p.subjects,
    }));
  }
}
