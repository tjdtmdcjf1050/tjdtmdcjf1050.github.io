"use client";
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AccountClient from "../account/AccountClient";
import { useActionDialog } from "../components/ActionDialogProvider";

type Work = {
  id: number;
  title: string;
  summary: string;
  status: string;
  workStatus: string;
  visibility: string;
  coverImage: string;
  topicName: string;
  topicColor: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  deletedAt: string | null;
  seriesId: number | null;
  seriesTitle: string | null;
  seriesOrder: number;
  publishChallenge: boolean;
  candidateStatus: string | null;
  candidateScore: number | null;
  attemptNumber: number | null;
  eligibleAgainAt: string | null;
  decisionReason: string | null;
  readers: number;
  completions: number;
  likes: number;
  purchases: number;
  recommends: number;
  comments: number;
  sponsorshipAmount: number;
};
type Series = {
  id: number;
  title: string;
  description: string;
  status: string;
  updatedAt: string;
  workCount: number;
};
type EventItem = {
  id: number;
  type: string;
  title: string;
  summary: string;
  venue: string;
  startsAt: string;
  capacity: number;
  fee: number;
  status: string;
  adminNote: string;
  applicants: number;
};
type Finance = {
  id: number;
  postId: number | null;
  eventId: number | null;
  type: string;
  amount: number;
  quantity: number;
  status: string;
  occurredAt: string;
  note: string;
};
type StudioData = {
  works: Work[];
  series: Series[];
  comments: {
    id: number;
    postId: number;
    postTitle: string;
    userDisplayName: string;
    content: string;
    createdAt: string;
  }[];
  events: EventItem[];
  finances: Finance[];
  attempts: {
    postId: number;
    attemptNumber: number;
    startsAt: string;
    endsAt: string;
    targetCount: number;
    score: number;
    status: string;
    resultReason: string;
  }[];
};
type ReadingData = {
  recent: { id:number; title:string; authorName:string; topicName:string; topicColor:string; coverImage:string; lastViewedAt:string; progressPercent:number|null }[];
  later: { id:number; title:string; topicName:string; topicColor:string; savedAt:string }[];
};
const statusLabels: Record<string, string> = {
  draft: "준비 중",
  scheduled: "예약 발행",
  published: "발행",
  preparing: "준비 중",
  ongoing: "연재 중",
  paused: "휴재",
  completed: "완결",
  submitted: "검토 대기",
  approved: "승인",
  rejected: "반려",
  closed: "종료",
  challenging: "도전 중",
  qualified: "기준 달성",
  reviewing: "심사 중",
  selected: "선정",
  declined: "탈락",
  on_hold: "보류",
};
const eventLabels: Record<string, string> = {
  lecture: "작가 강의",
  popup: "팝업 행사",
  portfolio: "포트폴리오 모임",
};
const financeLabels: Record<string, string> = {
  sale: "도서 판매",
  royalty: "작가 인세",
  lecture_income: "강의 수익",
  event_income: "행사 수익",
  sponsorship: "후원",
  donation: "사회공헌",
};
async function getJson<T>(r: Response): Promise<T> {
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || "요청을 처리하지 못했습니다.");
  return d;
}
function money(value: number) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}
function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StudioClient({ displayName, isDemo = false }: { displayName: string; isDemo?: boolean }) {
  const { confirmAction } = useActionDialog();
  const [data, setData] = useState<StudioData | null>(null),
    [reading, setReading] = useState<ReadingData | null>(null),
    [tab, setTab] = useState("works"),
    [workFilter, setWorkFilter] = useState("active"),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [schedule, setSchedule] = useState<Record<number, string>>({});
  const [seriesTitle, setSeriesTitle] = useState(""),
    [seriesDescription, setSeriesDescription] = useState("");
  const [eventType, setEventType] = useState("lecture"),
    [eventTitle, setEventTitle] = useState(""),
    [eventSummary, setEventSummary] = useState(""),
    [eventVenue, setEventVenue] = useState(""),
    [eventDate, setEventDate] = useState(""),
    [eventCapacity, setEventCapacity] = useState(20),
    [eventFee, setEventFee] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studioData, readingData] = await Promise.all([
        fetch("/api/studio", { cache: "no-store" }).then((r) => getJson<StudioData>(r)),
        fetch("/api/library", { cache: "no-store" }).then((r) => getJson<ReadingData>(r)),
      ]);
      setData(studioData);
      setReading(readingData);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "작가 스튜디오를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const requested = new URL(location.href).searchParams.get("tab");
      if (["works", "reading", "reactions", "events", "finance", "profile"].includes(requested || ""))
        setTab(requested || "works");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function changeTab(next: string) {
    setTab(next);
    const url = new URL(location.href);
    if (next === "works") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    history.replaceState({}, "", `${url.pathname}${url.search}`);
  }
  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await fetch("/api/studio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => getJson(r));
      setMessage("변경사항을 저장했습니다.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function createSeries(e: FormEvent) {
    e.preventDefault();
    if (!seriesTitle.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "series",
          title: seriesTitle,
          description: seriesDescription,
        }),
      }).then((r) => getJson(r));
      setSeriesTitle("");
      setSeriesDescription("");
      setMessage("새 시리즈를 만들었습니다.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "시리즈를 만들지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function createEvent(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "event",
          type: eventType,
          title: eventTitle,
          summary: eventSummary,
          venue: eventVenue,
          startsAt: eventDate,
          capacity: eventCapacity,
          fee: eventFee,
        }),
      }).then((r) => getJson(r));
      setEventTitle("");
      setEventSummary("");
      setEventVenue("");
      setEventDate("");
      setMessage("행사 신청서를 운영진에게 보냈습니다.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "행사를 신청하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reattempt(postId: number) {
    if (!(await confirmAction({
      title: "출판 도전 다시 시작",
      message: "새로운 기간으로 출판 도전을 다시 시작할까요? 이전 도전 기록은 보존됩니다.",
      confirmLabel: "다시 시작",
    }))) return;
    setBusy(true);
    try {
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reattempt", postId }),
      }).then((r) => getJson(r));
      setMessage("새 출판 도전을 시작했습니다.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "재도전을 시작하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  function exportFinance() {
    if (!data) return;
    const rows = [
      ["일자", "구분", "금액", "수량", "상태", "메모"],
      ...data.finances.map((item) => [
        item.occurredAt,
        financeLabels[item.type] || item.type,
        String(item.amount),
        String(item.quantity),
        item.status,
        item.note,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "GROW_BOOK_작가정산.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const works = useMemo(
    () =>
      data?.works.filter((work) =>
        workFilter === "trash"
          ? Boolean(work.deletedAt)
          : workFilter === "scheduled"
            ? work.status === "scheduled"
            : workFilter === "published"
              ? work.status === "published" && !work.deletedAt
              : workFilter === "draft"
                ? work.status === "draft" && !work.deletedAt
                : !work.deletedAt,
      ) || [],
    [data, workFilter],
  );
  const totals = useMemo(
    () => ({
      readers: data?.works.reduce((sum, w) => sum + Number(w.readers), 0) || 0,
      purchases:
        data?.works.reduce((sum, w) => sum + Number(w.purchases), 0) || 0,
      income:
        data?.finances
          .filter((item) => item.type !== "donation")
          .reduce((sum, item) => sum + item.amount, 0) || 0,
      donation:
        data?.finances
          .filter((item) => item.type === "donation")
          .reduce((sum, item) => sum + item.amount, 0) || 0,
    }),
    [data],
  );
  return (
    <main className="studio-page">
      {isDemo && (
        <aside className="product-shell demo-mode-banner" aria-label="체험 계정 안내">
          <div>
            <span aria-hidden="true">G</span>
            <p><strong>지금은 방문자별 체험 공간입니다.</strong><small>내 공간·프로필·글쓰기·저장을 자유롭게 확인할 수 있으며, 내용은 이 브라우저에서 30일간 유지됩니다.</small></p>
          </div>
          <a href="/api/auth/logout?returnTo=/login">체험 종료 · 계정 만들기 →</a>
        </aside>
      )}
      <section className="product-shell studio-hero">
        <div>
          <p className="product-eyebrow">MY LIBRARY & STUDIO</p>
          <h1>{displayName}님의 공간</h1>
          <p>
            원고 발행부터 독자 반응, 행사 신청, 수익과 사회공헌까지 한곳에서
            관리하세요.
          </p>
        </div>
        <a className="product-button product-button-primary" href="/write">
          새 작품 쓰기 ＋
        </a>
      </section>
      <section className="product-shell studio-summary">
        <article>
          <span>전체 작품</span>
          <strong>{data?.works.filter((w) => !w.deletedAt).length || 0}</strong>
        </article>
        <article>
          <span>누적 독자</span>
          <strong>{totals.readers}</strong>
        </article>
        <article>
          <span>구매 의사</span>
          <strong>{totals.purchases}</strong>
        </article>
        <article>
          <span>기록 수익</span>
          <strong>{money(totals.income)}</strong>
        </article>
      </section>
      {message && (
        <p className="product-shell studio-message" role="status">
          {message}
        </p>
      )}
      <nav
        className="product-shell studio-tabs"
        aria-label="작가 스튜디오 메뉴"
      >
        {[
          ["works", "작품"],
          ["reading", "독서 기록"],
          ["reactions", "반응·알림"],
          ["events", "행사"],
          ["finance", "수익"],
          ["profile", "프로필"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "is-active" : ""}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => changeTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {loading ? (
        <div className="product-shell studio-loading">
          <span />
          스튜디오 데이터를 정리하고 있습니다.
        </div>
      ) : (
        data && (
          <div className="product-shell studio-content">
            {tab === "works" && (
              <section className="studio-panel">
                <header>
                  <div>
                    <p className="product-eyebrow">WORKS</p>
                    <h2>작품 상태와 발행 관리</h2>
                  </div>
                  <div className="studio-filter-tabs">
                    {[
                      ["active", "전체"],
                      ["draft", "준비 중"],
                      ["scheduled", "예약"],
                      ["published", "발행"],
                      ["trash", "휴지통"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={workFilter === value ? "is-active" : ""}
                        onClick={() => setWorkFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </header>
                {works.length === 0 ? (
                  <div className="studio-empty">
                    <span>✎</span>
                    <h3>이 상태의 작품이 없습니다.</h3>
                    <p>새 원고를 시작하거나 다른 상태를 선택해 주세요.</p>
                  </div>
                ) : (
                  <div className="studio-work-list">
                    {works.map((work) => (
                      <article
                        key={work.id}
                        className={work.deletedAt ? "is-trashed" : ""}
                      >
                        <div
                          className="studio-work-cover"
                          style={
                            { "--category-color": work.topicColor } as React.CSSProperties
                          }
                        >
                          {work.coverImage ? (
                            <img src={work.coverImage} alt="" />
                          ) : (
                            <small>{work.title}</small>
                          )}
                          <i className="category-band">{work.topicName}</i>
                        </div>
                        <div className="studio-work-main">
                          <div className="studio-work-badges">
                            <span>
                              {statusLabels[work.status] || work.status}
                            </span>
                            <span>
                              {statusLabels[work.workStatus] || work.workStatus}
                            </span>
                            <span>
                              {work.visibility === "public"
                                ? "공개"
                                : work.visibility === "private"
                                  ? "비공개"
                                  : "링크 공개"}
                            </span>
                            {work.publishChallenge && (
                              <span className="is-lime">
                                출판 도전 {work.candidateScore || 0}점
                              </span>
                            )}
                          </div>
                          <h3>{work.title}</h3>
                          <p>{work.summary || "작품 소개가 없습니다."}</p>
                          <div className="studio-mini-stats">
                            <span>독자 {work.readers}</span>
                            <span>완독 {work.completions}</span>
                            <span>구매 {work.purchases}</span>
                            <span>댓글 {work.comments}</span>
                          </div>
                          {work.status === "scheduled" && (
                            <small>
                              예약: {date(work.scheduledAt || work.updatedAt)}
                            </small>
                          )}
                          {work.decisionReason && (
                            <blockquote>{work.decisionReason}</blockquote>
                          )}
                        </div>
                        <details className="studio-work-settings">
                          <summary>
                            {work.deletedAt ? "복원 옵션" : "관리 설정"}
                          </summary>
                          {!work.deletedAt ? (
                            <>
                              <label>
                                작품 상태
                                <select
                                  value={work.workStatus}
                                  onChange={(e) =>
                                    void patch({
                                      action: "work",
                                      id: work.id,
                                      workStatus: e.target.value,
                                      visibility: work.visibility,
                                      seriesId: work.seriesId,
                                      seriesOrder: work.seriesOrder,
                                    })
                                  }
                                >
                                  <option value="preparing">준비 중</option>
                                  <option value="ongoing">연재 중</option>
                                  <option value="paused">휴재</option>
                                  <option value="completed">완결</option>
                                </select>
                              </label>
                              <label>
                                공개 범위
                                <select
                                  value={work.visibility}
                                  onChange={(e) =>
                                    void patch({
                                      action: "work",
                                      id: work.id,
                                      workStatus: work.workStatus,
                                      visibility: e.target.value,
                                      seriesId: work.seriesId,
                                      seriesOrder: work.seriesOrder,
                                    })
                                  }
                                >
                                  <option value="public">전체 공개</option>
                                  <option value="private">비공개</option>
                                  <option value="preview">일부 공개</option>
                                </select>
                              </label>
                              <label>
                                시리즈
                                <select
                                  value={work.seriesId || ""}
                                  onChange={(e) =>
                                    void patch({
                                      action: "work",
                                      id: work.id,
                                      workStatus: work.workStatus,
                                      visibility: work.visibility,
                                      seriesId: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                      seriesOrder: work.seriesOrder,
                                    })
                                  }
                                >
                                  <option value="">시리즈 없음</option>
                                  {data.series.map((series) => (
                                    <option key={series.id} value={series.id}>
                                      {series.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="studio-schedule">
                                <input
                                  type="datetime-local"
                                  value={schedule[work.id] || ""}
                                  onChange={(e) =>
                                    setSchedule((current) => ({
                                      ...current,
                                      [work.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  disabled={!schedule[work.id] || busy}
                                  onClick={() =>
                                    void patch({
                                      action: "schedule",
                                      id: work.id,
                                      scheduledAt: schedule[work.id],
                                    })
                                  }
                                >
                                  예약
                                </button>
                                {work.status === "scheduled" && (
                                  <button
                                    onClick={() =>
                                      void patch({
                                        action: "cancelSchedule",
                                        id: work.id,
                                      })
                                    }
                                  >
                                    취소
                                  </button>
                                )}
                              </div>
                              <div className="studio-work-actions">
                                <a href={`/write?id=${work.id}`}>원고 수정</a>
                                <a
                                  href={`/studio/print/${work.id}`}
                                  target="_blank"
                                >
                                  PDF 저장
                                </a>
                                {["declined", "on_hold"].includes(
                                  work.candidateStatus || "",
                                ) && (
                                  <button
                                    onClick={() => void reattempt(work.id)}
                                  >
                                    재도전
                                  </button>
                                )}
                                <button
                                  className="danger"
                                  onClick={() =>
                                    void patch({ action: "trash", id: work.id })
                                  }
                                >
                                  휴지통
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="studio-work-actions">
                              <button
                                onClick={() =>
                                  void patch({ action: "restore", id: work.id })
                                }
                              >
                                작품 복원
                              </button>
                            </div>
                          )}
                        </details>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {tab === "reading" && (
              <section className="studio-panel reading-panel">
                <header><div><p className="product-eyebrow">MY READING</p><h2>최근 읽은 작품과 나중에 읽기</h2></div><a href="/community">새 작품 찾기 →</a></header>
                <div className="reading-history-grid">
                  {reading?.recent.length ? reading.recent.map(item=><a href={`/community/${item.id}`} key={item.id} style={{"--topic-color":item.topicColor} as React.CSSProperties}><span>{item.coverImage?<img src={item.coverImage} alt=""/>:item.topicName}</span><div><small>최근 읽음 · {item.progressPercent||0}%</small><strong>{item.title}</strong><i><b style={{width:`${item.progressPercent||0}%`}}/></i></div></a>):<div className="studio-empty"><p>아직 읽은 작품이 없습니다.</p></div>}
                </div>
                <h3>나중에 읽기</h3>
                <div className="reading-later-list">{reading?.later.length?reading.later.map(item=><a href={`/community/${item.id}`} key={item.id}><i style={{background:item.topicColor}}/><strong>{item.title}</strong><span>{item.topicName}</span><small>읽기 →</small></a>):<p>저장한 작품이 없습니다.</p>}</div>
              </section>
            )}
            {tab === "reactions" && (
              <section className="studio-panel">
                <header>
                  <div>
                    <p className="product-eyebrow">AUDIENCE</p>
                    <h2>작품별 독자 반응</h2>
                  </div>
                </header>
                <div className="studio-analytics-grid">
                  {data.works
                    .filter((w) => !w.deletedAt)
                    .map((work) => {
                      const rate = work.readers
                        ? Math.round((work.completions / work.readers) * 100)
                        : 0;
                      return (
                        <article key={work.id}>
                          <h3>{work.title}</h3>
                          <div>
                            <span>
                              <strong>{work.readers}</strong>순독자
                            </span>
                            <span>
                              <strong>{rate}%</strong>완독률
                            </span>
                            <span>
                              <strong>{work.purchases}</strong>구매 의사
                            </span>
                            <span>
                              <strong>{work.recommends}</strong>추천
                            </span>
                          </div>
                          <i>
                            <b style={{ width: `${rate}%` }} />
                          </i>
                        </article>
                      );
                    })}
                </div>
                <div className="studio-comment-feed">
                  <h3>최근 댓글</h3>
                  {data.comments.length ? (
                    data.comments.map((comment) => (
                      <a href={`/community/${comment.postId}`} key={comment.id}>
                        <span>{comment.userDisplayName.charAt(0)}</span>
                        <div>
                          <strong>
                            {comment.userDisplayName} · {comment.postTitle}
                          </strong>
                          <p>{comment.content}</p>
                          <small>{date(comment.createdAt)}</small>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="studio-empty">
                      <p>아직 도착한 댓글이 없습니다.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
            {tab === "works" && (
              <section className="studio-panel studio-two-column">
                <div>
                  <header>
                    <div>
                      <p className="product-eyebrow">SERIES</p>
                      <h2>시리즈 관리</h2>
                    </div>
                  </header>
                  <div className="studio-series-list">
                    {data.series.map((series) => (
                      <article key={series.id}>
                        <div>
                          <strong>{series.title}</strong>
                          <p>{series.description}</p>
                          <small>
                            {series.workCount}개 작품 ·{" "}
                            {statusLabels[series.status] || series.status}
                          </small>
                        </div>
                        <a
                          href={`/community?search=${encodeURIComponent(series.title)}`}
                        >
                          작품 보기 →
                        </a>
                      </article>
                    ))}
                  </div>
                </div>
                <form className="studio-form" onSubmit={createSeries}>
                  <h3>새 시리즈 만들기</h3>
                  <label>
                    시리즈 제목
                    <input
                      value={seriesTitle}
                      onChange={(e) => setSeriesTitle(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    소개
                    <textarea
                      value={seriesDescription}
                      onChange={(e) => setSeriesDescription(e.target.value)}
                      maxLength={240}
                    />
                  </label>
                  <button disabled={busy || seriesTitle.trim().length < 2}>
                    시리즈 만들기
                  </button>
                </form>
              </section>
            )}
            {tab === "events" && (
              <section className="studio-panel studio-two-column">
                <div>
                  <header>
                    <div>
                      <p className="product-eyebrow">OFFLINE & CLASS</p>
                      <h2>내 강의·행사 신청</h2>
                    </div>
                    <a href="/events">공개 일정 보기 →</a>
                  </header>
                  <div className="studio-event-list">
                    {data.events.map((event) => (
                      <article key={event.id}>
                        <span>{eventLabels[event.type] || event.type}</span>
                        <h3>{event.title}</h3>
                        <p>
                          {date(event.startsAt)} · {event.venue}
                        </p>
                        <div>
                          <strong>
                            {statusLabels[event.status] || event.status}
                          </strong>
                          <small>
                            신청자 {event.applicants}/{event.capacity}명
                          </small>
                        </div>
                        {event.adminNote && (
                          <blockquote>{event.adminNote}</blockquote>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
                <form className="studio-form" onSubmit={createEvent}>
                  <h3>작가 행사 신청</h3>
                  <label>
                    종류
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="lecture">작가 강의</option>
                      <option value="popup">팝업 행사</option>
                      <option value="portfolio">포트폴리오 모임</option>
                    </select>
                  </label>
                  <label>
                    행사 제목
                    <input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    소개
                    <textarea
                      value={eventSummary}
                      onChange={(e) => setEventSummary(e.target.value)}
                      maxLength={500}
                    />
                  </label>
                  <label>
                    장소
                    <input
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    희망 일정
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <label>
                      정원
                      <input
                        type="number"
                        value={eventCapacity}
                        min={2}
                        max={500}
                        onChange={(e) =>
                          setEventCapacity(Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      참가비
                      <input
                        type="number"
                        value={eventFee}
                        min={0}
                        onChange={(e) => setEventFee(Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <button disabled={busy}>운영진에게 신청</button>
                  <small>승인된 행사만 독자에게 공개됩니다.</small>
                </form>
              </section>
            )}
            {tab === "finance" && (
              <section className="studio-panel">
                <header>
                  <div>
                    <p className="product-eyebrow">REVENUE & IMPACT</p>
                    <h2>판매·수익·사회공헌</h2>
                  </div>
                  <div>
                    <button onClick={exportFinance}>CSV 정산서</button>
                    <button onClick={() => print()}>PDF 인쇄</button>
                  </div>
                </header>
                <div className="finance-summary">
                  <article>
                    <span>누적 기록 수익</span>
                    <strong>{money(totals.income)}</strong>
                  </article>
                  <article>
                    <span>사회공헌 완료</span>
                    <strong>{money(totals.donation)}</strong>
                  </article>
                  <article>
                    <span>정산 대기</span>
                    <strong>
                      {money(
                        data.finances
                          .filter((item) => item.status === "payable")
                          .reduce((sum, item) => sum + item.amount, 0),
                      )}
                    </strong>
                  </article>
                </div>
                <div className="finance-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>일자</th>
                        <th>구분</th>
                        <th>수량</th>
                        <th>금액</th>
                        <th>상태</th>
                        <th>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.finances.map((item) => (
                        <tr key={item.id}>
                          <td>{date(item.occurredAt)}</td>
                          <td>{financeLabels[item.type] || item.type}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <strong>{money(item.amount)}</strong>
                          </td>
                          <td>{item.status}</td>
                          <td>{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="studio-finance-note">
                  현재 금액은 테스트 장부입니다. 실제 지급·결제는 결제대행사와
                  정산 계정 연결 후 활성화됩니다.
                </p>
              </section>
            )}
            {tab === "profile" && <AccountClient initialName={displayName} embedded isDemo={isDemo} />}
          </div>
        )
      )}
    </main>
  );
}
