import { AttemptsService } from "./attempts.service";
import { PrismaService } from "../prisma/prisma.service";

function makePrismaMock() {
  return {
    quizAttempt: {
      create: jest.fn().mockResolvedValue({ id: "attempt-1" }),
    },
  } as unknown as PrismaService;
}

const questions = [
  {
    id: "q1",
    text: "1+1?",
    options: ["1", "2", "3", "4"],
    correctIndex: 1,
    explanation: "2.",
  },
  {
    id: "q2",
    text: "수도?",
    options: ["a", "b", "c", "d"],
    correctIndex: 2,
    explanation: "c.",
  },
];

describe("AttemptsService.record", () => {
  it("정답/오답을 채점하고 점수를 계산한다", async () => {
    const prisma = makePrismaMock();
    const service = new AttemptsService(prisma);

    const res = await service.record("user-1", "quiz-1", questions, [
      { questionId: "q1", selectedIndex: 1 }, // 정답
      { questionId: "q2", selectedIndex: 0 }, // 오답
    ]);

    expect(res.total).toBe(2);
    expect(res.score).toBe(1);
    expect(res.results[0].isCorrect).toBe(true);
    expect(res.results[1].isCorrect).toBe(false);
    expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(1);
  });

  it("미응답 문항은 selectedIndex 가 null 이고 오답으로 처리된다", async () => {
    const prisma = makePrismaMock();
    const service = new AttemptsService(prisma);

    const res = await service.record("user-1", "quiz-1", questions, [
      { questionId: "q1", selectedIndex: 1 },
    ]);

    expect(res.total).toBe(2);
    expect(res.score).toBe(1);
    const q2 = res.results.find((r) => r.questionId === "q2");
    expect(q2?.selectedIndex).toBeNull();
    expect(q2?.isCorrect).toBe(false);
  });

  it("저장 시 응답한 문항만 AnswerRecord 로 기록한다", async () => {
    const prisma = makePrismaMock();
    const service = new AttemptsService(prisma);

    await service.record("user-1", "quiz-1", questions, [
      { questionId: "q1", selectedIndex: 1 },
    ]);

    const createArg = (prisma.quizAttempt.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.answers.create).toHaveLength(1);
    expect(createArg.data.score).toBe(1);
    expect(createArg.data.total).toBe(2);
  });
});
