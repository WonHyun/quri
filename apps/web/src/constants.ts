import type { Difficulty } from "./types";

export const RANDOM_TOPICS = [
  "광합성",
  "프랑스 혁명",
  "양자역학 기초",
  "한국사: 조선의 건국",
  "자료구조와 알고리즘",
  "기후 변화",
  "그리스 신화",
  "경제학의 수요와 공급",
  "인체의 소화 기관",
  "셰익스피어의 비극",
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};
