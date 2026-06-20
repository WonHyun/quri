import { useCallback, useEffect, useRef, useState } from "react";
import {
  createQuizJob,
  deleteQuizJob,
  listQuizJobs,
  UnauthorizedError,
} from "../api";
import type { Difficulty, QuizJob } from "../types";

const POLL_INTERVAL_MS = 2500;

function isActive(job: QuizJob): boolean {
  return job.status === "pending" || job.status === "running";
}

export interface CreateJobInput {
  topic: string;
  count: number;
  choiceCount: number;
  difficulty: Difficulty;
  presetSlug?: string;
  subject?: string;
}

/**
 * 비동기 퀴즈 생성 작업 관리.
 *
 * 생성 요청을 큐에 넣고(즉시 반환) 진행 중인 작업이 있으면 폴링한다.
 * 작업이 완료(ready)되는 순간 onReady 를 호출해 소유 퀴즈 목록을 새로고침한다.
 * 덕분에 사용자는 생성이 끝나길 기다리지 않고 다른 퀴즈를 풀 수 있다.
 */
export function useQuizJobs(opts: {
  enabled: boolean;
  onReady: () => void;
  onUnauthorized: () => void;
}) {
  const { enabled, onReady, onUnauthorized } = opts;
  const [jobs, setJobs] = useState<QuizJob[]>([]);
  const [creating, setCreating] = useState(false);

  // 콜백/이전 상태를 ref 로 보관해 폴링 인터벌의 stale closure 를 피한다.
  const onReadyRef = useRef(onReady);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const readySeenRef = useRef<Set<string>>(new Set());
  onReadyRef.current = onReady;
  onUnauthorizedRef.current = onUnauthorized;

  const reconcile = useCallback((list: QuizJob[]) => {
    let hasNewReady = false;
    for (const job of list) {
      if (job.status === "ready" && !readySeenRef.current.has(job.id)) {
        readySeenRef.current.add(job.id);
        hasNewReady = true;
      }
    }
    setJobs(list);
    if (hasNewReady) onReadyRef.current();
  }, []);

  const refresh = useCallback(async () => {
    try {
      reconcile(await listQuizJobs());
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorizedRef.current();
    }
  }, [reconcile]);

  // 로그인 시 1회 동기화, 로그아웃 시 정리.
  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      readySeenRef.current = new Set();
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  // 진행 중 작업이 있을 때만 주기적으로 폴링한다.
  const hasActive = jobs.some(isActive);
  useEffect(() => {
    if (!enabled || !hasActive) return;
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, hasActive, refresh]);

  const enqueue = useCallback(async (input: CreateJobInput) => {
    setCreating(true);
    try {
      const job = await createQuizJob(input);
      setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
      return job;
    } finally {
      setCreating(false);
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    readySeenRef.current.delete(id);
    try {
      await deleteQuizJob(id);
    } catch {
      /* 정리는 베스트에포트 — 실패해도 UI 에서는 이미 제거됨 */
    }
  }, []);

  return { jobs, creating, enqueue, dismiss };
}
