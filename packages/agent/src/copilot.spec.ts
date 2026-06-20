import { extractJsonArray } from "./copilot";

describe("extractJsonArray", () => {
  it("순수 JSON 배열을 그대로 추출한다", () => {
    const input = '[{"a":1}]';
    expect(extractJsonArray(input)).toBe('[{"a":1}]');
  });

  it("앞뒤 설명/코드펜스가 섞여 있어도 배열만 추출한다", () => {
    const input = '설명입니다.\n```json\n[{"x":"y"}]\n```\n끝.';
    expect(extractJsonArray(input)).toBe('[{"x":"y"}]');
  });

  it("문자열 내부의 대괄호에 영향받지 않는다", () => {
    const input = '[{"text":"배열 [중첩] 표현"}]';
    expect(extractJsonArray(input)).toBe('[{"text":"배열 [중첩] 표현"}]');
  });

  it("중첩 배열의 균형을 올바르게 맞춘다", () => {
    const input = 'prefix [[1,2],[3,4]] suffix';
    expect(extractJsonArray(input)).toBe("[[1,2],[3,4]]");
  });

  it("배열이 없으면 null 을 반환한다", () => {
    expect(extractJsonArray("배열 없음")).toBeNull();
  });

  it("이스케이프된 따옴표를 포함한 문자열을 처리한다", () => {
    const input = '[{"q":"그는 \\"안녕\\" 이라 말했다"}]';
    expect(extractJsonArray(input)).toBe(input);
  });
});
