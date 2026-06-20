import { useState } from "react";
import {
  guestLogin as apiGuestLogin,
  login as apiLogin,
  resendCode as apiResendCode,
  signup as apiSignup,
  verifySignup as apiVerifySignup,
} from "../api";
import type { AuthUser } from "../types";

export function AuthView(props: {
  onAuthed: (token: string, user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function resetTo(next: "login" | "signup") {
    setMode(next);
    setStep("form");
    setError(null);
    setInfo(null);
    setCode("");
  }

  async function submit() {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        const res = await apiLogin({ email: email.trim(), password });
        props.onAuthed(res.token, res.user);
      } else {
        await apiSignup({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
        });
        setStep("verify");
        setInfo("인증 코드를 이메일로 보냈어요. 받은 6자리 코드를 입력해 주세요.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (code.trim().length !== 6) {
      setError("6자리 인증 코드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiVerifySignup({
        email: email.trim(),
        code: code.trim(),
      });
      props.onAuthed(res.token, res.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await apiResendCode({ email: email.trim() });
      setInfo("인증 코드를 다시 보냈어요.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startGuest() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGuestLogin();
      props.onAuthed(res.token, res.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "signup" && step === "verify") {
    return (
      <div className="auth-layout">
        <main className="auth-main">
          <section className="card fade-in auth-card">
            <h2>이메일 인증</h2>
            <p className="card-sub">
              <strong>{email.trim()}</strong> 으로 보낸 6자리 코드를 입력해
              회원가입을 완료하세요.
            </p>

            {error && (
              <div className="banner error" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="banner" role="status">
                <span>📧</span>
                <span>{info}</span>
              </div>
            )}

            <label className="field">
              <span className="label">인증 코드</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                placeholder="000000"
                autoComplete="one-time-code"
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
            </label>

            <button className="primary" onClick={verify} disabled={loading}>
              <span className="btn-i">✅</span> 인증하고 가입 완료
            </button>

            <p
              className="card-sub"
              style={{ marginTop: 16, textAlign: "center" }}
            >
              코드를 받지 못하셨나요?{" "}
              <button className="link-btn" onClick={resend} disabled={loading}>
                코드 다시 보내기
              </button>
            </p>
            <p className="card-sub" style={{ textAlign: "center" }}>
              <button className="link-btn" onClick={() => resetTo("signup")}>
                ← 정보 다시 입력
              </button>
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <section className="card fade-in auth-card">
          <h2>{mode === "login" ? "로그인" : "회원가입"}</h2>
          <p className="card-sub">
            {mode === "login"
              ? "이메일로 로그인하고 내 퀴즈 기록을 이어가세요."
              : "이메일로 가입하면 만든 퀴즈와 기록이 계정에 저장됩니다."}
          </p>

          {error && (
            <div className="banner error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === "signup" && (
            <label className="field">
              <span className="label">표시 이름 (선택)</span>
              <input
                type="text"
                value={displayName}
                placeholder="예: 길동"
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span className="label">이메일</span>
            <input
              type="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">비밀번호</span>
            <input
              type="password"
              value={password}
              placeholder="8자 이상"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </label>

          <button className="primary" onClick={submit} disabled={loading}>
            <span className="btn-i">{mode === "login" ? "🔑" : "✨"}</span>{" "}
            {mode === "login" ? "로그인" : "인증 코드 받기"}
          </button>

          <div className="auth-divider">
            <span>또는</span>
          </div>

          <button className="ghost auth-guest" onClick={startGuest} disabled={loading}>
            <span className="btn-i">👋</span> 게스트로 둘러보기
          </button>
          <p className="card-sub" style={{ marginTop: 8, textAlign: "center" }}>
            가입 없이 바로 체험할 수 있어요. 기록은 임시 저장되며, 나중에
            회원가입하면 계정으로 이어갈 수 있어요.
          </p>

          <p className="card-sub" style={{ marginTop: 16, textAlign: "center" }}>
            {mode === "login" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
            <button
              className="link-btn"
              onClick={() => {
                resetTo(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
