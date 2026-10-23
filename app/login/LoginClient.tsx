"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

type Mode = "login" | "signup";
type AuthResponse = { error?: string; message?: string };

function safeReturnPath() {
  const value = new URLSearchParams(location.search).get("returnTo");
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/studio";
}

export default function LoginClient({ sessionRole }: { sessionRole: string | null }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"account" | "demo" | null>(null);
  const isDemo = sessionRole === "tester";

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    setPassword("");
  }

  async function request(path: string, body: Record<string, string> = {}) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });
    const result = (await response.json()) as AuthResponse;
    if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
    return result;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy("account");
    try {
      const result = await request(`/api/auth/${mode}`, {
        username,
        password,
        displayName,
      });
      setMessage(result.message || (mode === "signup" ? "회원가입이 완료되었습니다." : "로그인되었습니다."));
      location.replace(safeReturnPath());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function startDemo() {
    setMessage("");
    setBusy("demo");
    try {
      let deviceId = "";
      try {
        deviceId = localStorage.getItem("growbook-demo-device") || "";
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("growbook-demo-device", deviceId);
        }
      } catch {
        deviceId = crypto.randomUUID();
      }
      const result = await request("/api/auth/demo", { deviceId });
      setMessage(result.message || "체험 공간을 준비했습니다.");
      location.replace(safeReturnPath());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "체험 공간을 준비하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="login-page">
      <a className="login-brand" href="/">
        <span>G</span>
        <strong>GROW BOOK</strong>
      </a>
      <section className="login-card">
        <div className="login-visual">
          <p>WRITE · CONNECT · PUBLISH</p>
          <div className="login-book login-book-back">PUBLISH</div>
          <div className="login-book login-book-middle">CONNECT</div>
          <div className="login-book login-book-front">
            <span>01</span>
            <strong>한 번의 클릭으로<br />이야기를 시작해요.</strong>
          </div>
        </div>
        <div className="login-content">
          <p className="product-eyebrow">WELCOME TO GROW BOOK</p>
          <h1>{sessionRole ? (isDemo ? "체험 공간이 열려 있어요." : "이미 로그인되어 있어요.") : "먼저 직접 둘러보세요."}</h1>

          {sessionRole ? (
            <div className="signed-in-actions">
              <div className="signed-in-notice">
                <span aria-hidden="true">✓</span>
                <p>{isDemo ? "로그인 없이 만든 나만의 체험 공간입니다." : "현재 계정으로 GROW BOOK을 이용 중입니다."}</p>
              </div>
              <a className="product-button product-button-primary product-button-wide" href="/studio">내 공간으로 이동 →</a>
              <a className="auth-secondary-link" href="/api/auth/logout?returnTo=/login">{isDemo ? "체험 종료 후 계정 만들기" : "로그아웃"}</a>
            </div>
          ) : (
            <>
              <section className="demo-entry" aria-labelledby="demo-entry-title">
                <span className="demo-entry-badge">체험판 추천</span>
                <h2 id="demo-entry-title">가입 없이 모든 화면 확인</h2>
                <p>내 공간, 프로필, 글쓰기와 저장 기능을 방문자별로 분리된 체험 계정에서 바로 확인할 수 있습니다.</p>
                <button type="button" className="product-button product-button-primary product-button-wide" disabled={busy !== null} onClick={() => void startDemo()}>
                  {busy === "demo" ? "체험 공간 준비 중…" : "로그인 없이 바로 체험하기 →"}
                </button>
                <small>체험 내용은 현재 브라우저에서 30일간 유지되며 정식 계정으로 자동 이전되지는 않습니다.</small>
              </section>

              <div className="auth-divider"><span>또는 계정으로 계속</span></div>
              <div className="auth-tabs" role="tablist" aria-label="계정 이용 방법">
                <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => changeMode("signup")}>회원가입</button>
                <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => changeMode("login")}>로그인</button>
              </div>
              <form className="local-auth-form" onSubmit={submit} aria-busy={busy === "account"}>
                {mode === "signup" && (
                  <label>
                    표시 이름
                    <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={40} autoComplete="name" placeholder="독자에게 보일 이름" />
                  </label>
                )}
                <label>
                  아이디
                  <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="영문 소문자·숫자·밑줄 4~20자" required minLength={4} maxLength={20} pattern="[a-z0-9_]{4,20}" autoCapitalize="none" spellCheck={false} />
                </label>
                <label>
                  비밀번호
                  <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" required minLength={8} />
                </label>
                {message && <p className="auth-message" role="alert" aria-live="assertive">{message}</p>}
                <button disabled={busy !== null} className="product-button product-button-dark product-button-wide">
                  {busy === "account" ? "처리 중…" : mode === "signup" ? "가입하고 시작하기 →" : "로그인 →"}
                </button>
              </form>
            </>
          )}
          <p className="login-terms">비밀번호는 암호화되어 저장되며 다른 방문자의 체험 내용과 섞이지 않습니다.</p>
          <a className="admin-entry" href="/admin">관리자 로그인</a>
        </div>
      </section>
    </main>
  );
}
