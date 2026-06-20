-- 멀티유저 전환: 사용자/소유권/기록 도메인 도입.

-- 기존 단일 사용자용 Attempt 제거 (유저 단위 QuizAttempt/AnswerRecord 로 대체)
DROP TABLE "Attempt";

-- CreateEnum
CREATE TYPE "QuizVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable: 퀴즈 콘텐츠에 난이도 보관
ALTER TABLE "Quiz" ADD COLUMN "difficulty" TEXT;

-- CreateTable: 사용자
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable: 소유권
CREATE TABLE "QuizOwnership" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "visibility" "QuizVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizOwnership_quizId_key" ON "QuizOwnership"("quizId");
CREATE INDEX "QuizOwnership_ownerId_idx" ON "QuizOwnership"("ownerId");

-- CreateTable: 풀이 시도(기록)
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateTable: 문항별 응답 기록
CREATE TABLE "AnswerRecord" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "AnswerRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerRecord_attemptId_idx" ON "AnswerRecord"("attemptId");
CREATE INDEX "AnswerRecord_questionId_idx" ON "AnswerRecord"("questionId");

-- AddForeignKey
ALTER TABLE "QuizOwnership" ADD CONSTRAINT "QuizOwnership_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizOwnership" ADD CONSTRAINT "QuizOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerRecord" ADD CONSTRAINT "AnswerRecord_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerRecord" ADD CONSTRAINT "AnswerRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
