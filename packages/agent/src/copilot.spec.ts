import {
  extractJsonArray,
  runWithConcurrency,
  splitIntoBatches,
} from "./copilot";

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

describe("splitIntoBatches", () => {
  it("total 이 size 이하면 단일 배치다", () => {
    expect(splitIntoBatches(5, 10)).toEqual([5]);
    expect(splitIntoBatches(10, 10)).toEqual([10]);
  });

  it("size 단위로 나누고 나머지를 마지막 배치에 담는다", () => {
    expect(splitIntoBatches(25, 10)).toEqual([10, 10, 5]);
    expect(splitIntoBatches(100, 10)).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  });

  it("최소 1 개 배치를 보장한다", () => {
    expect(splitIntoBatches(0, 10)).toEqual([1]);
  });
});

describe("runWithConcurrency", () => {
  it("입력 순서를 유지하며 모든 항목을 처리한다", async () => {
    const out = await runWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("동시 실행 수가 limit 을 넘지 않는다", async () => {
    let active = 0;
    let peak = 0;
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return null;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("작업 실패를 전파한다", async () => {
    await expect(
      runWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
