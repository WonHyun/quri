import { GeneratedQuizSchema } from "./schema";

describe("GeneratedQuizSchema", () => {
  const valid = [
    {
      question: "1+1은?",
      options: ["1", "2", "3", "4"],
      correctIndex: 1,
      explanation: "1 더하기 1은 2.",
    },
  ];

  it("올바른 퀴즈를 통과시킨다", () => {
    expect(GeneratedQuizSchema.safeParse(valid).success).toBe(true);
  });

  it("빈 배열을 거부한다", () => {
    expect(GeneratedQuizSchema.safeParse([]).success).toBe(false);
  });

  it("correctIndex 가 보기 범위를 벗어나면 거부한다", () => {
    const bad = [{ ...valid[0], correctIndex: 9 }];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("보기가 2개 미만이면 거부한다", () => {
    const bad = [{ ...valid[0], options: ["하나"], correctIndex: 0 }];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("보기 5개(5지선다)를 허용한다", () => {
    const five = [
      {
        question: "수도는?",
        options: ["a", "b", "c", "d", "e"],
        correctIndex: 4,
        explanation: "e 가 정답.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(five).success).toBe(true);
  });
});
