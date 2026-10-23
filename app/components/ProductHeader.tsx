/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid a Vinext hydration conflict in this hosted runtime */
import type { ChatGPTUser } from "../chatgpt-auth";

export default function ProductHeader({ user }: { user: ChatGPTUser }) {
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "G";

  return (
    <header className="product-header">
      <div className="product-shell product-header-inner">
        <a className="product-brand" href="/" aria-label="GROW BOOK 홈">
          <span aria-hidden="true">G</span>
          <strong>GROW BOOK</strong>
        </a>

        <nav className="product-nav" aria-label="서비스 메뉴">
          <a href="/">발견</a>
          <a href="/community">탐색</a>
          <a href="/rankings">랭킹</a>
          <a href="/write">글쓰기</a>
          <a href="/studio?tab=reading">내 서재</a>
          <a href="/studio">내 공간</a>
          <details className="desktop-more-menu">
            <summary>더보기</summary>
            <div>
              <a href="/challenges">출판 프로젝트</a>
              <a href="/events">강의·행사</a>
              <a href="/impact">사회공헌</a>
              <a href="/notifications">알림함</a>
              <a href="/about">서비스 소개</a>
            </div>
          </details>
        </nav>

        <div className="account-menu">
          <a
            className="account-profile-link"
            href="/studio?tab=profile"
            aria-label="내 공간 프로필"
          >
            <span className="account-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="account-name">{user.displayName}</span>
          </a>
          <span className={`test-mode-label${user.role === "tester" ? " is-demo" : ""}`}>
            {user.role === "tester" ? "체험 중" : "BETA"}
          </span>
        </div>
      </div>
    </header>
  );
}
