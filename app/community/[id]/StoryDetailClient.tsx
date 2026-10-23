"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- plain anchors avoid a Vinext hydration conflict in this hosted runtime */
/* eslint-disable @next/next/no-img-element -- remote user-provided cover URLs are intentionally rendered directly */

import { FormEvent, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useModalFocus } from "../../use-modal-focus";
import { useActionDialog } from "../../components/ActionDialogProvider";

const PAGE_SEPARATOR = "\n\n<!-- GROWBOOK PAGE -->\n\n";
const TITLE_PATTERN = /^<!-- GROWBOOK TITLE:(.*?) -->\n?/;
function parseStoryPages(content: string) {
  const pages = content
    .split(PAGE_SEPARATOR)
    .map((raw, index) => {
      const match = raw.match(TITLE_PATTERN);
      let title = `${index + 1}장`;
      if (match) {
        try {
          title = decodeURIComponent(match[1]);
        } catch {
          /* keep fallback title */
        }
      }
      return { title, content: raw.replace(TITLE_PATTERN, "").trim() };
    })
    .filter((page) => page.content);
  return pages.length ? pages : [{ title: "1장", content: "본문이 없습니다." }];
}

function ReactionIcon({ name }: { name: "like" | "purchase" | "recommend" }) {
  return <svg className="reaction-icon" viewBox="0 0 24 24" aria-hidden="true">
    {name === "like" && <path d="M12 20.2 4.9 13.4A4.8 4.8 0 0 1 11.7 6l.3.4.3-.4a4.8 4.8 0 0 1 6.8 6.8Z"/>}
    {name === "purchase" && <><path d="M5 8.5h14l-1 11H6Z"/><path d="M8.5 8.5a3.5 3.5 0 0 1 7 0"/></>}
    {name === "recommend" && <><path d="M5 19 19 5"/><path d="M9 5h10v10"/></>}
  </svg>;
}

type Story = {
  id: number;
  title: string;
  summary: string;
  content: string;
  authorName: string;
  authorEmail: string;
  authorProfileImage: string;
  categoryName: string;
  categoryColor: string;
  publishedAt: string;
  topicName: string;
  topicSlug: string;
  topicColor: string;
  format: string;
  workStatus: string;
  visibility: string;
  publishChallenge: boolean;
  sponsorshipEnabled: boolean;
  commentsEnabled: boolean;
  purchaseGoal: number;
  candidateStatus: string | null;
  candidateScore: number | null;
  selectionReason: string | null;
  decisionReason: string | null;
  challengeStartsAt: string | null;
  challengeEndsAt: string | null;
  targetCount: number | null;
  attemptNumber: number | null;
  eligibleAgainAt: string | null;
  scoreBreakdown: Record<string, number>;
  anomalousExcluded: number;
  likeCount: number;
  purchaseCount: number;
  recommendCount: number;
  completionCount: number;
  sponsorCount: number;
  sponsorAmount: number;
  tags: string;
  coverImage: string;
  seriesTitle: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  chapters?: {
    id: number;
    title: string;
    content: string;
    position: number;
    status: string;
    scheduledAt: string | null;
  }[];
  attempts: {
    attemptNumber: number;
    startsAt: string;
    endsAt: string;
    targetCount: number;
    score: number;
    status: string;
    resultReason: string;
  }[];
  seriesWorks: { id: number; title: string; seriesOrder: number }[];
};
type Comment = {
  id: number;
  userDisplayName: string;
  content: string;
  createdAt: string;
  isOwner: boolean;
};
type DetailData = {
  post: Story;
  comments: Comment[];
  viewer: {
    like: boolean;
    purchase: boolean;
    recommend: boolean;
    bookmark: boolean;
    sponsoredAmount: number;
    chapterIndex: number;
    progressPercent: number;
    completed: boolean;
  };
  publishingRule: {
    purchaseWeight: number;
    completionWeight: number;
    recommendWeight: number;
    engagementWeight: number;
    challengeDays: number;
  };
  serverNow: string;
  signedIn: boolean;
};

const FORMAT_LABELS: Record<string, string> = {
  novel: "소설",
  essay: "에세이",
  poetry: "시",
  prose: "산문",
  other: "기타",
};
const STATUS_LABELS: Record<string, string> = {
  preparing: "준비 중",
  ongoing: "연재 중",
  completed: "완결",
  paused: "휴재",
};
const CANDIDATE_LABELS: Record<string, string> = {
  challenging: "도전 중",
  qualified: "기준 달성",
  reviewing: "운영진 검토",
  selected: "후보 선정",
  contracting: "계약 협의",
  producing: "제작 중",
  preorder: "예약 판매",
  published: "출간 완료",
  on_hold: "선정 보류",
  declined: "선정 종료",
};

async function getJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function StoryDetailClient({
  postId,
  signInPath,
}: {
  postId: string;
  signInPath: string;
}) {
  const { confirmAction, promptAction } = useActionDialog();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [sponsorAmount, setSponsorAmount] = useState(5000);
  const [sponsorMessage, setSponsorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [readerSize, setReaderSize] = useState(0);
  const [readerTheme, setReaderTheme] = useState<"light" | "paper" | "dark">(
    "paper",
  );
  const [tocOpen, setTocOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const sponsorDialog = useRef<HTMLElement>(null);
  const closeSponsor = useCallback(() => setSponsorOpen(false), []);
  useModalFocus(sponsorOpen, sponsorDialog, closeSponsor);

  const loadStory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetch(`/api/community/${postId}`, {
        cache: "no-store",
      }).then((response) => getJson<DetailData>(response));
      setData(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "글을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem(`growbook-progress-${postId}`) || "{}",
        );
        if (Number.isInteger(saved.page) && saved.page >= 0)
          setCurrentPage(saved.page);
        const pref = JSON.parse(
          localStorage.getItem("growbook-reader") || "{}",
        );
        if (typeof pref.size === "number" && Number.isFinite(pref.size))
          setReaderSize(Math.min(4, Math.max(-2, pref.size)));
        if (["light", "paper", "dark"].includes(pref.theme))
          setReaderTheme(pref.theme);
      } catch {
        /* use defaults */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [postId]);

  function requireSignIn() {
    if (data?.signedIn) return true;
    window.location.href = signInPath;
    return false;
  }

  async function toggleReaction(type: "like" | "purchase" | "recommend") {
    if (!requireSignIn() || !data) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch(`/api/community/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }).then((response) =>
        getJson<{
          active: boolean;
          likeCount: number;
          purchaseCount: number;
          recommendCount: number;
        }>(response),
      );
      setData({
        ...data,
        post: {
          ...data.post,
          likeCount: result.likeCount,
          purchaseCount: result.purchaseCount,
          recommendCount: result.recommendCount,
        },
        viewer: { ...data.viewer, [type]: result.active },
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "반응을 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireSignIn() || !data || !comment.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch(`/api/community/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      }).then((response) => getJson<{ comment: Comment }>(response));
      setData({ ...data, comments: [...data.comments, result.comment] });
      setComment("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "댓글을 등록하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(commentId: number) {
    if (!data || !(await confirmAction({
      title: "댓글 삭제",
      message: "이 댓글을 삭제할까요? 삭제한 댓글은 복구할 수 없습니다.",
      confirmLabel: "삭제",
      danger: true,
    }))) return;
    setBusy(true);
    try {
      await fetch(`/api/community/${postId}/comments/${commentId}`, {
        method: "DELETE",
      }).then((response) => getJson<{ deleted: boolean }>(response));
      setData({
        ...data,
        comments: data.comments.filter((item) => item.id !== commentId),
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitSponsorship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requireSignIn() || !data) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch(`/api/community/${postId}/sponsorships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: sponsorAmount,
          message: sponsorMessage,
        }),
      }).then((response) =>
        getJson<{
          sponsoredAmount: number;
          sponsorCount: number;
          sponsorAmount: number;
        }>(response),
      );
      setData({
        ...data,
        post: {
          ...data.post,
          sponsorCount: result.sponsorCount,
          sponsorAmount: result.sponsorAmount,
        },
        viewer: { ...data.viewer, sponsoredAmount: result.sponsoredAmount },
      });
      setSponsorOpen(false);
      setMessage("후원 의사가 작가에게 전달되었습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "후원 의사를 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(kind: "bookmark" | "follow" | "report") {
    if (!requireSignIn() || !data) return;
    const reason =
      kind === "report"
        ? await promptAction({
            title: "콘텐츠 신고",
            message: "운영진이 판단할 수 있도록 신고 이유를 간단히 적어 주세요.",
            inputLabel: "신고 사유",
            defaultValue: "부적절한 콘텐츠",
            confirmLabel: "신고 접수",
            danger: true,
            maxLength: 300,
          })
        : undefined;
    if (kind === "report" && !reason) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch(`/api/community/${postId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: kind, reason }),
      }).then((r) => getJson<{ active?: boolean; received?: boolean }>(r));
      if (kind === "bookmark")
        setData({
          ...data,
          viewer: { ...data.viewer, bookmark: Boolean(result.active) },
        });
      setMessage(
        kind === "report"
          ? "신고가 접수되었습니다."
          : kind === "follow"
            ? result.active
              ? "작가를 팔로우했습니다."
              : "팔로우를 취소했습니다."
            : result.active
              ? "글을 저장했습니다."
              : "저장을 취소했습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: data?.post.title || "GROW BOOK", url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
      else throw new Error("링크 복사를 지원하지 않는 브라우저입니다.");
      if (!navigator.share) setMessage("글 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(
        error instanceof Error ? error.message : "공유하지 못했습니다.",
      );
    }
  }

  if (loading)
    return (
      <main className="story-detail-loading">
        <span />
        이야기를 펼치고 있습니다.
      </main>
    );
  if (!data)
    return (
      <main className="story-detail-error">
        <h1>글을 표시할 수 없습니다.</h1>
        <p>{message}</p>
        <a href="/community">둘러보기로 돌아가기</a>
      </main>
    );
  const { post } = data;
  const storyPages = post.chapters?.length
    ? post.chapters.map((chapter) => ({
        title: chapter.title,
        content: chapter.content,
      }))
    : parseStoryPages(post.content);
  const safePage = Math.min(currentPage, Math.max(0, storyPages.length - 1));
  const visiblePage = storyPages[safePage] || { title: "1장", content: "" };
  const targetCount = post.targetCount || post.purchaseGoal;
  const challengeDaysLeft = post.challengeEndsAt
    ? Math.ceil(
        (new Date(post.challengeEndsAt).getTime() -
          new Date(data.serverNow).getTime()) /
          86400000,
      )
    : null;

  function turnPage(nextPage: number) {
    if (nextPage < 0 || nextPage >= storyPages.length) return;
    setCurrentPage(nextPage);
    try {
      localStorage.setItem(
        `growbook-progress-${postId}`,
        JSON.stringify({ page: nextPage, updatedAt: new Date().toISOString() }),
      );
    } catch {
      /* reading still works without local progress */
    }
    const progressPercent = Math.round(
      ((nextPage + 1) / storyPages.length) * 100,
    );
    void fetch(`/api/community/${postId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterIndex: nextPage,
        progressPercent,
        completed: nextPage === storyPages.length - 1,
      }),
    }).catch(() => undefined);
    window.requestAnimationFrame(() =>
      document
        .querySelector(".story-reader")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <main className="story-detail-page">
      <article className="product-shell story-detail-article">
        <header className={`story-detail-header ${post.coverImage ? "has-cover" : "without-cover"}`}>
          <a className="detail-back-link" href="/community">← 둘러보기</a>
          <div className="detail-intro">
            {post.coverImage && (
              <figure
                className="detail-cover-frame"
                style={
                  { "--category-color": post.topicColor || post.categoryColor } as CSSProperties
                }
              >
                <img className="detail-cover" src={post.coverImage} alt={`${post.title} 표지`} />
                <figcaption className="category-band">{post.topicName || post.categoryName}</figcaption>
              </figure>
            )}
            <div className="detail-intro-copy">
              <div className="detail-meta-line">
                <div className="detail-category">
                  <i style={{ backgroundColor: post.topicColor || post.categoryColor }} />
                  {post.topicName || post.categoryName} · {FORMAT_LABELS[post.format] || post.categoryName}
                </div>
                <div className="story-badges detail-story-badges">
                  <span>{STATUS_LABELS[post.workStatus] || "연재 중"}</span>
                  {post.publishChallenge && <span className="is-challenge">출판 도전</span>}
                </div>
              </div>
              <h1>{post.title}</h1>
              {post.summary && <p className="detail-summary">{post.summary}</p>}
              <a className="detail-author" href={`/writers/${encodeURIComponent(post.authorEmail.split("@")[0] || "guest")}`}>
                <span className="detail-author-avatar" role="img" aria-label={`${post.authorName} 작가 프로필 이미지`}>
                  {post.authorProfileImage ? <img src={post.authorProfileImage} alt="" /> : <span>{post.authorName.charAt(0)}</span>}
                </span>
                <div className="detail-author-copy">
                  <strong>{post.authorName}</strong>
                  <span><time>{formatDate(post.publishedAt)}</time><small>작가 프로필 보기 →</small></span>
                </div>
              </a>
              {post.seriesTitle && !(post.seriesWorks?.length > 1) && <p className="detail-series">시리즈 · {post.seriesTitle}</p>}
              {post.seriesWorks?.length > 1 && (
                <details className="detail-series-disclosure">
                  <summary>{post.seriesTitle} · {post.seriesWorks.length}편 보기</summary>
                  <nav className="detail-series-nav" aria-label="시리즈 작품">
                    {post.seriesWorks.map((item) => (
                      <a key={item.id} className={item.id === post.id ? "is-current" : ""} href={`/community/${item.id}`}>
                        <span>{String(item.seriesOrder || 1).padStart(2, "0")}</span>{item.title}
                      </a>
                    ))}
                  </nav>
                </details>
              )}
              {post.tags && <div className="detail-tags">{post.tags.split(",").map((tag) => <span key={tag}>#{tag.trim()}</span>)}</div>}
            </div>
          </div>
        </header>

        {post.publishChallenge && (
          <section
            className="detail-publication-panel"
            aria-labelledby="publication-progress-title"
          >
            <header>
              <div>
                <p className="product-eyebrow">
                  PUBLISHING CHALLENGE · {post.attemptNumber || 1}차 도전
                </p>
                <h2 id="publication-progress-title">
                  독자와 함께 출판 가능성을 확인 중입니다.
                </h2>
                <p>
                  목표 달성 후 자동 출판이 아니라 운영진의 원고·저작권 검토
                  단계로 이동합니다.
                </p>
              </div>
              <div className="publication-score">
                <span>공정 점수</span>
                <strong>{post.candidateScore || 0}</strong>
                <small>
                  {challengeDaysLeft === null
                    ? "기간 확인 중"
                    : challengeDaysLeft < 0
                      ? "도전 기간 종료"
                      : `D-${challengeDaysLeft}`}
                </small>
              </div>
            </header>
            <div className="publication-meter">
              <div>
                <span>
                  {CANDIDATE_LABELS[post.candidateStatus || "challenging"] ||
                    "도전 중"}
                </span>
                <strong>
                  {post.purchaseCount} / {targetCount}명
                </strong>
              </div>
              <i>
                <span
                  style={{
                    width: `${Math.min(100, (post.purchaseCount / Math.max(1, targetCount)) * 100)}%`,
                  }}
                />
              </i>
              <small>
                {Math.min(
                  100,
                  Math.round(
                    (post.purchaseCount / Math.max(1, targetCount)) * 100,
                  ),
                )}
                % 달성
              </small>
            </div>
            <details className="publication-transparency">
              <summary>점수 선정 방식 자세히 보기</summary>
              <div>
                <span>
                  구매 의사{" "}
                  <strong>{data.publishingRule.purchaseWeight}%</strong>
                </span>
                <span>
                  완독률{" "}
                  <strong>{data.publishingRule.completionWeight}%</strong>
                </span>
                <span>
                  추천 <strong>{data.publishingRule.recommendWeight}%</strong>
                </span>
                <span>
                  댓글·저장{" "}
                  <strong>{data.publishingRule.engagementWeight}%</strong>
                </span>
              </div>
              <p>
                계정별 동일 반응은 한 번만 반영하며, 짧은 시간에 반복된 비정상
                반응은 자동 제외됩니다.
                {post.anomalousExcluded > 0 &&
                  ` 현재 ${post.anomalousExcluded}건을 제외했습니다.`}
              </p>
            </details>
            {post.decisionReason && (
              <blockquote>
                <strong>운영진 판단 근거</strong>
                {post.decisionReason}
              </blockquote>
            )}
            {post.selectionReason && (
              <blockquote>
                <strong>선정 이유</strong>
                {post.selectionReason}
              </blockquote>
            )}
            {post.attempts?.length > 1 && (
              <details className="publication-attempts">
                <summary>이전 도전 기록 {post.attempts.length}회</summary>
                <ol>
                  {post.attempts.map((item) => (
                    <li key={item.attemptNumber}>
                      <span>{item.attemptNumber}차</span>
                      <strong>
                        {CANDIDATE_LABELS[item.status] || item.status} ·{" "}
                        {item.score}점
                      </strong>
                      <small>
                        {new Date(item.startsAt).toLocaleDateString("ko-KR")}–
                        {new Date(item.endsAt).toLocaleDateString("ko-KR")}
                      </small>
                      {item.resultReason && <p>{item.resultReason}</p>}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        )}

        <section
          className={`story-reader reader-theme-${readerTheme}`}
          aria-label={`${post.title} 읽기`}
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return;
            const delta =
              (event.changedTouches[0]?.clientX ?? touchStart.current) -
              touchStart.current;
            touchStart.current = null;
            if (Math.abs(delta) < 55) return;
            turnPage(
              delta < 0
                ? Math.min(storyPages.length - 1, safePage + 1)
                : Math.max(0, safePage - 1),
            );
          }}
        >
          <div className="reader-tools">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-expanded={tocOpen}
            >
              ☰ 목차
            </button>
            <div>
              <button
                type="button"
                onClick={() => {
                  const size = Math.max(-2, readerSize - 1);
                  setReaderSize(size);
                  localStorage.setItem(
                    "growbook-reader",
                    JSON.stringify({ size, theme: readerTheme }),
                  );
                }}
                aria-label="글자 작게"
              >
                가−
              </button>
              <button
                type="button"
                onClick={() => {
                  const size = Math.min(4, readerSize + 1);
                  setReaderSize(size);
                  localStorage.setItem(
                    "growbook-reader",
                    JSON.stringify({ size, theme: readerTheme }),
                  );
                }}
                aria-label="글자 크게"
              >
                가＋
              </button>
              <select
                aria-label="읽기 배경"
                value={readerTheme}
                onChange={(e) => {
                  const theme = e.target.value as "light" | "paper" | "dark";
                  setReaderTheme(theme);
                  localStorage.setItem(
                    "growbook-reader",
                    JSON.stringify({ size: readerSize, theme }),
                  );
                }}
              >
                <option value="light">화이트</option>
                <option value="paper">아이보리</option>
                <option value="dark">다크</option>
              </select>
            </div>
          </div>
          {tocOpen && (
            <nav className="reader-toc" aria-label="작품 목차">
              <strong>작품 목차</strong>
              <ol>
                {storyPages.map((page, index) => (
                  <li key={`${page.title}-${index}`}>
                    <button
                      type="button"
                      className={index === safePage ? "is-active" : ""}
                      onClick={() => {
                        turnPage(index);
                        setTocOpen(false);
                      }}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {page.title}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="story-reader-progress">
            <span>{safePage + 1}장</span>
            <div aria-hidden="true">
              <i
                style={{
                  width: `${((safePage + 1) / storyPages.length) * 100}%`,
                }}
              />
            </div>
            <span>전체 {storyPages.length}장</span>
          </div>
          <div
            className={`story-paper manuscript-font-${post.fontFamily}`}
            style={{
              fontSize: `${post.fontSize + readerSize}px`,
              lineHeight: post.lineHeight / 100,
            }}
          >
            <h2>{visiblePage.title}</h2>
            {visiblePage.content.split(/\n{2,}/).map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
            ))}
          </div>
          <nav className="story-page-nav" aria-label="글 페이지 이동">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => turnPage(safePage - 1)}
            >
              ← 이전 장
            </button>
            <span>
              <strong>{safePage + 1}</strong> / {storyPages.length}
            </span>
            <button
              type="button"
              onClick={() =>
                safePage === storyPages.length - 1
                  ? turnPage(0)
                  : turnPage(safePage + 1)
              }
            >
              {safePage === storyPages.length - 1
                ? "처음부터 읽기 ↻"
                : "다음 장 →"}
            </button>
          </nav>
        </section>

        <aside className="reaction-bar" aria-label="글 반응">
          <button
            type="button"
            className={data.viewer.like ? "is-active" : ""}
            disabled={busy}
            onClick={() => void toggleReaction("like")}
          >
            <ReactionIcon name="like" />
            <strong>좋아요</strong>
            <small>{post.likeCount}</small>
          </button>
          <button
            type="button"
            className={data.viewer.purchase ? "is-active" : ""}
            disabled={busy}
            onClick={() => void toggleReaction("purchase")}
          >
            <ReactionIcon name="purchase" />
            <strong>구매희망</strong>
            <small>{post.purchaseCount}</small>
          </button>
          <button
            type="button"
            className={data.viewer.recommend ? "is-active" : ""}
            disabled={busy}
            onClick={() => void toggleReaction("recommend")}
          >
            <ReactionIcon name="recommend" />
            <strong>추천</strong>
            <small>{post.recommendCount}</small>
          </button>
        </aside>
        <div className="story-utility">
          <button
            className={data.viewer.bookmark ? "is-active" : ""}
            onClick={() => void action("bookmark")}
          >
            {data.viewer.bookmark ? "저장됨" : "나중에 읽기"}
          </button>
          {post.sponsorshipEnabled && (
            <button
              className={data.viewer.sponsoredAmount ? "is-active" : ""}
              disabled={busy}
              onClick={() => requireSignIn() && setSponsorOpen(true)}
            >
              후원 의사 {post.sponsorCount}
            </button>
          )}
          <button onClick={() => void action("follow")}>+ 작가 팔로우</button>
          <button onClick={() => void share()}>공유하기</button>
          <button onClick={() => void action("report")}>신고</button>
        </div>

        {message && (
          <p className="detail-message" role="status">
            {message}
          </p>
        )}

        {post.sponsorshipEnabled && (
          <details className="support-summary">
            <summary>작가 후원 현황</summary>
            <div>
              <p className="product-eyebrow">SUPPORT THE WRITER</p>
              <h2>이 이야기가 계속 자라도록.</h2>
            </div>
            <div>
              <strong>
                {Number(post.sponsorAmount).toLocaleString("ko-KR")}원
              </strong>
              <span>{post.sponsorCount}명이 후원 의사를 보냈어요</span>
            </div>
          </details>
        )}

        {post.commentsEnabled ? (
          <section
            className="comments-section"
            aria-labelledby="comments-title"
          >
            <div className="comments-heading">
              <div>
                <p className="product-eyebrow">READER’S NOTE</p>
                <h2 id="comments-title">
                  댓글 <span>{data.comments.length}</span>
                </h2>
              </div>
            </div>
            <form className="comment-form" onSubmit={submitComment}>
              <label className="sr-only" htmlFor="comment-content">
                댓글 작성
              </label>
              <textarea
                id="comment-content"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                placeholder="이 글에서 발견한 마음을 남겨주세요."
              />
              <div>
                <span>{comment.length}/500</span>
                <button type="submit" disabled={busy || !comment.trim()}>
                  댓글 등록
                </button>
              </div>
            </form>
            <div className="comment-list">
              {data.comments.length === 0 ? (
                <p className="no-comments">첫 번째 댓글을 남겨보세요.</p>
              ) : (
                data.comments.map((item) => (
                  <article key={item.id} className="comment-item">
                    <span className="comment-avatar" aria-hidden="true">
                      {item.userDisplayName.charAt(0)}
                    </span>
                    <div>
                      <header>
                        <strong>{item.userDisplayName}</strong>
                        <time>{formatDate(item.createdAt)}</time>
                        {item.isOwner && (
                          <button
                            type="button"
                            onClick={() => void deleteComment(item.id)}
                          >
                            삭제
                          </button>
                        )}
                      </header>
                      <p>{item.content}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="comments-section comments-closed">
            <h2>댓글을 받지 않는 작품입니다.</h2>
            <p>좋아요·추천·구매희망으로 작품을 응원할 수 있습니다.</p>
          </section>
        )}
      </article>

      {post.sponsorshipEnabled && sponsorOpen && (
        <div
          className="sponsor-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSponsorOpen(false);
          }}
        >
          <section
            ref={sponsorDialog}
            className="sponsor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-title"
          >
            <button
              className="sponsor-close"
              type="button"
              onClick={() => setSponsorOpen(false)}
              aria-label="후원 창 닫기"
            >
              ×
            </button>
            <p className="product-eyebrow">CHEER FOR THE STORY</p>
            <h2 id="sponsor-title">작가의 다음 문장을 응원해 주세요.</h2>
            <p>지금은 결제 없이 후원 의사와 희망 금액만 기록됩니다.</p>
            <form onSubmit={submitSponsorship}>
              <fieldset>
                <legend>후원 희망 금액</legend>
                <div>
                  {[3000, 5000, 10000, 30000].map((amount) => (
                    <label
                      key={amount}
                      className={sponsorAmount === amount ? "is-selected" : ""}
                    >
                      <input
                        type="radio"
                        name="sponsor-amount"
                        value={amount}
                        checked={sponsorAmount === amount}
                        onChange={() => setSponsorAmount(amount)}
                      />
                      {amount.toLocaleString("ko-KR")}원
                    </label>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="sponsor-message">
                응원 메시지 <span>선택</span>
              </label>
              <textarea
                id="sponsor-message"
                value={sponsorMessage}
                onChange={(event) => setSponsorMessage(event.target.value)}
                maxLength={120}
                placeholder="작가에게 전하고 싶은 말을 남겨주세요."
              />
              <button
                className="product-button product-button-primary product-button-wide"
                type="submit"
                disabled={busy}
              >
                후원 의사 보내기 →
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
