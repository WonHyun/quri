/** JWT 페이로드 — 토큰 안에 담기는 최소 식별 정보. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** 가드 통과 후 요청에 주입되는 인증 사용자. */
export interface AuthUser {
  id: string;
  email: string;
}
