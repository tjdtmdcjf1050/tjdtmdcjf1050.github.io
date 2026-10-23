"use client";
/* eslint-disable @next/next/no-html-link-for-pages */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useModalFocus } from "../use-modal-focus";

const steps = [
  {
    number: "01",
    title: "작품과 만남 찾기",
    text: "작품 검색과 복합 필터는 물론 작가 강의·팝업·오프라인 모임 일정도 함께 발견하세요.",
    href: "/community",
    cta: "통합 탐색하기",
  },
  {
    number: "02",
    title: "독자의 선택으로 키우기",
    text: "완독·추천·구매 의사가 공개된 기준에 따라 출판 가능성으로 쌓입니다.",
    href: "/rankings",
    cta: "출판 랭킹 보기",
  },
  {
    number: "03",
    title: "작가로 시작하기",
    text: "장편 편집기와 작가 스튜디오에서 작품·행사·수익 기록을 관리하세요.",
    href: "/write",
    cta: "첫 작품 쓰기",
  },
];

type IconName =
  | "home"
  | "search"
  | "write"
  | "studio"
  | "more"
  | "user"
  | "rank"
  | "project"
  | "event"
  | "impact"
  | "notice"
  | "guide";

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="M3.5 10.2 10 4.8l6.5 5.4" />
        <path d="M5.5 9.3v6.2h9V9.3" />
      </>
    ),
    search: (
      <>
        <circle cx="8.7" cy="8.7" r="4.4" />
        <path d="m12 12 4.1 4.1" />
      </>
    ),
    write: (
      <>
        <path d="M10 3.5v13M3.5 10h13" />
      </>
    ),
    studio: (
      <>
        <rect x="3.8" y="3.5" width="12.4" height="13" rx="1.5" />
        <path d="M6.8 7h6.4M6.8 10h6.4M6.8 13h4" />
      </>
    ),
    more: (
      <>
        <circle cx="4.5" cy="10" r="1" />
        <circle cx="10" cy="10" r="1" />
        <circle cx="15.5" cy="10" r="1" />
      </>
    ),
    user: (
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M4.5 16c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      </>
    ),
    rank: (
      <>
        <path d="M4 15.5V11h3v4.5M8.5 15.5V7h3v8.5M13 15.5V3.5h3v12" />
      </>
    ),
    project: (
      <>
        <path d="M10 3.5 16 10l-6 6.5L4 10Z" />
        <path d="M10 7v6M7.5 10h5" />
      </>
    ),
    event: (
      <>
        <rect x="3.5" y="5" width="13" height="11" rx="1.5" />
        <path d="M6.5 3.5V7M13.5 3.5V7M3.5 8.5h13" />
      </>
    ),
    impact: (
      <>
        <path d="M10 16.5c3.5-2 5.7-5 5.7-8.8-3.9 0-6.2 1.6-6.2 5.4" />
        <path d="M10 16.5c-3.1-1.5-5.4-4.1-5.7-7.6 3.5-.2 5.7 1.4 5.7 4.9" />
      </>
    ),
    notice: (
      <>
        <path d="M5.5 8.5a4.5 4.5 0 0 1 9 0c0 5 2 5 2 6h-13c0-1 2-1 2-6" />
        <path d="M8.2 16.2c.5.7 1.1 1 1.8 1s1.3-.3 1.8-1" />
      </>
    ),
    guide: (
      <>
        <circle cx="10" cy="10" r="6.5" />
        <path d="M8.2 8a2 2 0 1 1 3.3 1.5c-.9.6-1.5 1-1.5 2" />
        <path d="M10 14.7h.01" />
      </>
    ),
  };
  return (
    <svg className="app-nav-icon" viewBox="0 0 20 20" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function AppEnhancements() {
  const [onboarding, setOnboarding] = useState(false);
  const [step, setStep] = useState(0);
  const [more, setMore] = useState(false);
  const [path, setPath] = useState("");
  const moreDialog = useRef<HTMLElement>(null);
  const onboardingDialog = useRef<HTMLElement>(null);
  const closeMore = useCallback(() => setMore(false), []);
  const closeGuide = useCallback(() => setOnboarding(false), []);
  useModalFocus(more, moreDialog, closeMore);
  useModalFocus(onboarding, onboardingDialog, closeGuide);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPath(location.pathname);
      setOnboarding(new URLSearchParams(location.search).get("guide") === "1");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!path) return;
    document.querySelectorAll<HTMLAnchorElement>(".product-nav a").forEach((link) => {
      const target = new URL(link.href, location.origin).pathname;
      const targetUrl = new URL(link.href, location.origin);
      const tab = targetUrl.searchParams.get("tab");
      const active = target === "/" ? path === "/" : path.startsWith(target) && (target !== "/studio" || (tab === "reading" ? new URLSearchParams(location.search).get("tab") === "reading" : new URLSearchParams(location.search).get("tab") !== "reading"));
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }, [path]);

  function close() {
    setOnboarding(false);
    try {
      localStorage.setItem("growbook-onboarding-complete", "1");
    } catch {
      /* close for current visit */
    }
  }

  if (path.startsWith("/admin") || path.startsWith("/studio/print"))
    return null;
  const current = steps[step];

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
        <a className={path === "/" ? "is-active" : ""} aria-current={path === "/" ? "page" : undefined} href="/">
          <NavIcon name="home" />홈
        </a>
        <a
          className={path.startsWith("/community") ? "is-active" : ""}
          aria-current={path.startsWith("/community") ? "page" : undefined}
          href="/community"
        >
          <NavIcon name="search" />
          탐색
        </a>
        <a className="is-write" aria-current={path.startsWith("/write") ? "page" : undefined} href="/write">
          <span>
            <NavIcon name="write" />
          </span>
          글쓰기
        </a>
        <a
          className={path.startsWith("/studio") ? "is-active" : ""}
          aria-current={path.startsWith("/studio") ? "page" : undefined}
          href="/studio"
        >
          <NavIcon name="studio" />
          내 공간
        </a>
        <button
          className={more ? "is-active" : ""}
          onClick={() => setMore((value) => !value)}
          aria-expanded={more}
        >
          <NavIcon name="more" />
          더보기
        </button>
      </nav>

      {more && (
        <div className="mobile-more-sheet">
          <button aria-label="더보기 닫기" onClick={() => setMore(false)} />
          <section ref={moreDialog} role="dialog" aria-modal="true" aria-label="GROW BOOK 전체 메뉴">
            <header>
              <strong>GROW BOOK 메뉴</strong>
              <button aria-label="메뉴 닫기" onClick={() => setMore(false)}>
                ×
              </button>
            </header>
            <a href="/studio?tab=profile">
              <span>
                <NavIcon name="user" />
              </span>
              <div>
                <strong>내 프로필</strong>
                <small>작가 소개와 공개 정보 관리</small>
              </div>
            </a>
            <a href="/rankings">
              <span>
                <NavIcon name="rank" />
              </span>
              <div>
                <strong>랭킹·출판 후보</strong>
                <small>공개 점수와 후보 작품</small>
              </div>
            </a>
            <a href="/challenges">
              <span>
                <NavIcon name="project" />
              </span>
              <div>
                <strong>출판 프로젝트</strong>
                <small>앤솔로지와 도전 일정</small>
              </div>
            </a>
            <a href="/events">
              <span>
                <NavIcon name="event" />
              </span>
              <div>
                <strong>강의·오프라인 행사</strong>
                <small>작가와 독자 만남</small>
              </div>
            </a>
            <a href="/impact">
              <span>
                <NavIcon name="impact" />
              </span>
              <div>
                <strong>수익·사회공헌 공개</strong>
                <small>투명한 활동 기록</small>
              </div>
            </a>
            <a href="/notifications">
              <span>
                <NavIcon name="notice" />
              </span>
              <div>
                <strong>알림함</strong>
                <small>반응과 운영 결과</small>
              </div>
            </a>
            <a href="/?guide=1">
              <span>
                <NavIcon name="guide" />
              </span>
              <div>
                <strong>처음 이용 안내</strong>
                <small>핵심 기능을 3단계로 확인</small>
              </div>
            </a>
          </section>
        </div>
      )}

      {onboarding && (
        <div className="onboarding-backdrop" role="presentation">
          <section
            ref={onboardingDialog}
            className="onboarding-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <button
              className="onboarding-close"
              onClick={close}
              aria-label="이용 안내 닫기"
            >
              ×
            </button>
            <div className="onboarding-visual">
              <span>{current.number}</span>
              <strong>
                READ
                <br />
                WRITE
                <br />
                GROW
              </strong>
            </div>
            <div className="onboarding-copy">
              <p className="product-eyebrow">WELCOME TO GROW BOOK</p>
              <div className="onboarding-progress">
                {steps.map((_, index) => (
                  <i className={index <= step ? "is-active" : ""} key={index} />
                ))}
              </div>
              <h2 id="onboarding-title">{current.title}</h2>
              <p>{current.text}</p>
              <div className="onboarding-actions">
                {step > 0 && (
                  <button onClick={() => setStep((value) => value - 1)}>
                    이전
                  </button>
                )}
                <button
                  onClick={() => {
                    if (step < steps.length - 1) setStep((value) => value + 1);
                    else {
                      close();
                      location.href = current.href;
                    }
                  }}
                >
                  {step < steps.length - 1 ? "다음 →" : `${current.cta} →`}
                </button>
              </div>
              <button className="onboarding-skip" onClick={close}>
                안내 건너뛰기
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
