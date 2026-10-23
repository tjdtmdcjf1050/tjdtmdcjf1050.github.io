"use client";
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages -- native anchors preserve hosted navigation */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useModalFocus } from "../use-modal-focus";
import { useActionDialog } from "../components/ActionDialogProvider";

type CommunityPost = {
  id: number;
  title: string;
  summary: string;
  content: string;
  authorName: string;
  authorEmail: string;
  topicName: string;
  topicSlug: string;
  topicColor: string;
  format: string;
  workStatus: string;
  publishChallenge: boolean;
  purchaseGoal: number;
  candidateStatus: string | null;
  candidateScore: number | null;
  challengeEndsAt: string | null;
  coverImage: string;
  seriesTitle: string | null;
  publishedAt: string;
  likeCount: number;
  purchaseCount: number;
  recommendCount: number;
  bookmarkCount: number;
  readerCount: number;
  completionCount: number;
  commentCount: number;
  sponsorCount: number;
  isSaved: number;
};
type CommunityCategory = {
  name: string;
  slug: string;
  color: string;
  count: number;
};
type LibraryData = {
  recent: {
    id: number;
    title: string;
    authorName: string;
    topicName: string;
    topicColor: string;
    coverImage: string;
    lastViewedAt: string;
    progressPercent: number | null;
  }[];
  later: {
    id: number;
    title: string;
    topicName: string;
    topicColor: string;
    savedAt: string;
  }[];
  filters: { id: number; name: string; query: string }[];
};
type DiscoveryEvent = {
  id: number;
  ownerName: string;
  type: string;
  title: string;
  summary: string;
  venue: string;
  startsAt: string;
  capacity: number;
  fee: number;
  applicants: number;
  applied: number;
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
const EVENT_LABELS: Record<string, string> = {
  lecture: "작가 강의",
  popup: "팝업 행사",
  portfolio: "포트폴리오 모임",
};
const formatOptions = [
  ["novel", "소설"],
  ["essay", "에세이"],
  ["poetry", "시"],
  ["prose", "산문"],
  ["other", "기타"],
];
const statusOptions = [
  ["ongoing", "연재 중"],
  ["completed", "완결"],
  ["preparing", "준비 중"],
  ["paused", "휴재"],
];

async function getJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function CardMetricIcon({ name }: { name: "like" | "purchase" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "like" ? (
        <path d="M12 20.2 4.9 13.4A4.8 4.8 0 0 1 11.7 6l.3.4.3-.4a4.8 4.8 0 0 1 6.8 6.8Z" />
      ) : (
        <>
          <path d="M5 8.5h14l-1 11H6Z" />
          <path d="M8.5 8.5a3.5 3.5 0 0 1 7 0" />
        </>
      )}
    </svg>
  );
}

export default function CommunityClient({ home = false }: { home?: boolean }) {
  const { promptAction } = useActionDialog();
  const [posts, setPosts] = useState<CommunityPost[]>([]),
    [categories, setCategories] = useState<CommunityCategory[]>([]),
    [library, setLibrary] = useState<LibraryData | null>(null);
  const [exploreMode, setExploreMode] = useState<"stories" | "events">(
      "stories",
    ),
    [events, setEvents] = useState<DiscoveryEvent[]>([]),
    [eventType, setEventType] = useState("all"),
    [eventSearchDraft, setEventSearchDraft] = useState(""),
    [eventSearch, setEventSearch] = useState(""),
    [eventPage, setEventPage] = useState(1),
    [eventTotal, setEventTotal] = useState(0),
    [eventHasMore, setEventHasMore] = useState(false),
    [eventLoading, setEventLoading] = useState(false),
    [eventLoadingMore, setEventLoadingMore] = useState(false),
    [eventMessage, setEventMessage] = useState("");
  const [topics, setTopics] = useState<string[]>([]),
    [formats, setFormats] = useState<string[]>([]),
    [statuses, setStatuses] = useState<string[]>([]),
    [challengeOnly, setChallengeOnly] = useState(false),
    [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState("recent"),
    [searchDraft, setSearchDraft] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true),
    [loadingMore, setLoadingMore] = useState(false),
    [message, setMessage] = useState(""),
    [loadError, setLoadError] = useState(""),
    [viewMode, setViewMode] = useState<"card" | "list">("card"),
    [filterOpen, setFilterOpen] = useState(false),
    [ready, setReady] = useState(false);
  const postRequest = useRef(0);
  const filterDialog = useRef<HTMLElement>(null);
  const closeFilter = useCallback(() => setFilterOpen(false), []);
  useModalFocus(filterOpen, filterDialog, closeFilter);

  useEffect(() => {
    const timer = setTimeout(() => {
    try {
      const params = new URLSearchParams(location.search);
      setExploreMode(params.get("content") === "events" ? "events" : "stories");
      setEventType(params.get("eventType") || "all");
      setEventSearch(params.get("eventSearch") || "");
      setEventSearchDraft(params.get("eventSearch") || "");
      setTopics(
        (params.get("topics") || params.get("topic") || "")
          .split(",")
          .filter(Boolean),
      );
      setFormats(
        (params.get("formats") || params.get("format") || "")
          .split(",")
          .filter(Boolean),
      );
      setStatuses(
        (params.get("statuses") || params.get("workStatus") || "")
          .split(",")
          .filter(Boolean),
      );
      setChallengeOnly(params.get("challenge") === "1");
      setSavedOnly(params.get("saved") === "1");
      setSort(params.get("sort") || "recent");
      setSearch(params.get("search") || "");
      setSearchDraft(params.get("search") || "");
      const saved = localStorage.getItem("growbook-community-view");
      if (saved === "card" || saved === "list") setViewMode(saved);
    } catch {
      // Storage restrictions must not prevent public discovery.
    } finally {
      setReady(true);
    }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const currentQuery = useCallback(
    (targetPage = 1) => {
      const params = new URLSearchParams();
      if (exploreMode === "events") {
        params.set("content", "events");
        if (eventType !== "all") params.set("eventType", eventType);
        if (eventSearch) params.set("eventSearch", eventSearch);
      }
      if (topics.length) params.set("topics", topics.join(","));
      if (formats.length) params.set("formats", formats.join(","));
      if (statuses.length) params.set("statuses", statuses.join(","));
      if (challengeOnly) params.set("challenge", "1");
      if (savedOnly) params.set("saved", "1");
      if (search) params.set("search", search);
      if (sort !== "recent") params.set("sort", sort);
      params.set("page", String(targetPage));
      params.set("limit", "12");
      return params;
    },
    [
      challengeOnly,
      eventSearch,
      eventType,
      exploreMode,
      formats,
      savedOnly,
      search,
      sort,
      statuses,
      topics,
    ],
  );

  const loadPosts = useCallback(
    async (targetPage = 1, append = false) => {
      const requestId = ++postRequest.current;
      if (append) setLoadingMore(true);
      else { setLoading(true); setLoadingMore(false); }
      setLoadError("");
      try {
        const params = currentQuery(targetPage);
        const data = await fetch(`/api/community?${params}`, {
          cache: "no-store",
        }).then((r) =>
          getJson<{
            posts: CommunityPost[];
            categories: CommunityCategory[];
            total: number;
            hasMore: boolean;
          }>(r),
        );
        if (requestId !== postRequest.current) return;
        setPosts((current) =>
          append ? [...current, ...data.posts] : data.posts,
        );
        setCategories(data.categories);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(targetPage);
        const shareParams = new URLSearchParams(params);
        shareParams.delete("page");
        shareParams.delete("limit");
        history.replaceState(
          {},
          "",
          `${location.pathname}${shareParams.size ? `?${shareParams}` : ""}`,
        );
      } catch (error) {
        if (requestId !== postRequest.current) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "작품을 불러오지 못했습니다.",
        );
      } finally {
        if (requestId === postRequest.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [currentQuery],
  );

  const loadLibrary = useCallback(async () => {
    try {
      setLibrary(
        await fetch("/api/library", { cache: "no-store" }).then((r) =>
          getJson<LibraryData>(r),
        ),
      );
    } catch {
      /* 개인화 영역이 없어도 공개 탐색은 동작합니다. */
    }
  }, []);
  const loadEvents = useCallback(
    async (targetPage = 1, append = false) => {
      if (append) setEventLoadingMore(true);
      else setEventLoading(true);
      setEventMessage("");
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "12",
        });
        if (eventType !== "all") params.set("type", eventType);
        if (eventSearch) params.set("search", eventSearch);
        const data = await fetch(`/api/events?${params}`, {
          cache: "no-store",
        }).then((r) =>
          getJson<{
            events: DiscoveryEvent[];
            total: number;
            hasMore: boolean;
          }>(r),
        );
        setEvents((current) =>
          append ? [...current, ...data.events] : data.events,
        );
        setEventTotal(data.total);
        setEventHasMore(data.hasMore);
        setEventPage(targetPage);
      } catch (error) {
        setEventMessage(
          error instanceof Error
            ? error.message
            : "행사 일정을 불러오지 못했습니다.",
        );
      } finally {
        setEventLoading(false);
        setEventLoadingMore(false);
      }
    },
    [eventSearch, eventType],
  );
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void loadPosts(1, false);
      void loadLibrary();
    }, 0);
    return () => clearTimeout(timer);
  }, [ready, loadLibrary, loadPosts]);
  useEffect(() => {
    if (!ready || exploreMode !== "events") return;
    const timer = setTimeout(() => void loadEvents(1, false), 0);
    return () => clearTimeout(timer);
  }, [exploreMode, loadEvents, ready]);

  const activeFilterCount =
    topics.length +
    formats.length +
    statuses.length +
    (challengeOnly ? 1 : 0) +
    (savedOnly ? 1 : 0);
  const selectedLabels = useMemo(
    () => [
      ...categories
        .filter((item) => topics.includes(item.slug))
        .map((item) => item.name),
      ...formatOptions
        .filter(([value]) => formats.includes(value))
        .map(([, label]) => label),
      ...statusOptions
        .filter(([value]) => statuses.includes(value))
        .map(([, label]) => label),
      ...(challengeOnly ? ["출판 도전"] : []),
      ...(savedOnly ? ["나중에 읽기"] : []),
    ],
    [categories, challengeOnly, formats, savedOnly, statuses, topics],
  );
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchDraft.trim());
  }
  function submitEventSearch(event: FormEvent) {
    event.preventDefault();
    setEventSearch(eventSearchDraft.trim());
  }
  function clearFilters() {
    setTopics([]);
    setFormats([]);
    setStatuses([]);
    setChallengeOnly(false);
    setSavedOnly(false);
    setSearch("");
    setSearchDraft("");
    setSort("recent");
  }
  function changeView(next: "card" | "list") {
    setViewMode(next);
    try {
      localStorage.setItem("growbook-community-view", next);
    } catch {
      /* current view remains */
    }
  }
  function applySavedFilter(query: string) {
    const params = new URLSearchParams(query);
    setTopics(
      (params.get("topics") || params.get("topic") || "")
        .split(",")
        .filter(Boolean),
    );
    setFormats(
      (params.get("formats") || params.get("format") || "")
        .split(",")
        .filter(Boolean),
    );
    setStatuses(
      (params.get("statuses") || params.get("workStatus") || "")
        .split(",")
        .filter(Boolean),
    );
    setChallengeOnly(params.get("challenge") === "1");
    setSavedOnly(params.get("saved") === "1");
    setSort(params.get("sort") || "recent");
    setSearch(params.get("search") || "");
    setSearchDraft(params.get("search") || "");
  }
  async function saveFilter() {
    const name = await promptAction({
      title: "검색 조건 저장",
      message: "현재 선택한 검색·필터·정렬 조건을 내 공간에 저장합니다.",
      inputLabel: "검색 조건 이름",
      defaultValue: selectedLabels.join(" · ") || "내 검색 조건",
      confirmLabel: "저장",
      maxLength: 40,
    });
    if (!name?.trim()) return;
    const params = currentQuery(1);
    params.delete("page");
    params.delete("limit");
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), query: String(params) }),
      }).then((r) => getJson(r));
      setMessage("현재 검색 조건을 저장했습니다.");
      await loadLibrary();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "검색 조건을 저장하지 못했습니다.",
      );
    }
  }
  async function deleteFilter(id: number) {
    await fetch(`/api/library?id=${id}`, { method: "DELETE" }).then((r) =>
      getJson(r),
    );
    await loadLibrary();
  }

  return (
    <main className={`community-page${home ? " discovery-home" : ""}`} id="main-content">
      <section className="discovery-intro product-shell" aria-labelledby="discovery-title">
        <div>
          <p className="product-eyebrow">{home ? "READ · WRITE · GROW" : "EXPLORE"}</p>
          <h1 id="discovery-title">{home ? "오늘, 어떤 이야기를 만나볼까요?" : "마음에 남을 이야기를 찾아요."}</h1>
          <p>한 편의 글을 발견하고, 다음 책의 시작을 함께해요.</p>
        </div>
        <a className="discovery-writing-link" href="/write">나의 이야기 쓰기 <span aria-hidden="true">↗</span></a>
      </section>

      <section
        className="product-shell community-content-switch"
        aria-label="탐색할 콘텐츠 선택"
      >
        <button
          type="button"
          className={exploreMode === "stories" ? "is-active" : ""}
          aria-pressed={exploreMode === "stories"}
          onClick={() => setExploreMode("stories")}
        >
          <strong>작품</strong>
        </button>
        <button
          type="button"
          className={exploreMode === "events" ? "is-active" : ""}
          aria-pressed={exploreMode === "events"}
          onClick={() => setExploreMode("events")}
        >
          <strong>행사·강의</strong>
        </button>
      </section>

      {exploreMode === "stories" &&
        library &&
        (library.recent.length > 0 || library.filters.length > 0) && (
          <details
            className="product-shell discovery-personal"
            open={home || undefined}
          >
            <summary>
              이어서 읽기 · 저장한 필터
              <span>
                {library.recent.length + library.filters.length}개
              </span>
            </summary>
            <div className="discovery-personal-content">
            <div className="discovery-rail-heading">
              <div>
                <p className="product-eyebrow">CONTINUE & DISCOVER</p>
                <h2>내 독서 바로가기</h2>
              </div>
              <button type="button" onClick={() => setSavedOnly((v) => !v)}>
                나중에 읽기 {library.later.length}
              </button>
            </div>
            {library.recent.length > 0 && (
              <div className="recent-work-rail">
                {library.recent.map((item) => (
                  <a
                    href={`/community/${item.id}`}
                    key={item.id}
                    style={
                      {
                        "--topic-color": item.topicColor,
                      } as React.CSSProperties
                    }
                  >
                    <span>
                      {item.coverImage ? (
                        <img src={item.coverImage} alt="" />
                      ) : (
                        item.topicName
                      )}
                    </span>
                    <div>
                      <small>최근 읽음 · {item.progressPercent || 0}%</small>
                      <strong>{item.title}</strong>
                      <i>
                        <b style={{ width: `${item.progressPercent || 0}%` }} />
                      </i>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {library.filters.length > 0 && (
              <div className="saved-filter-list">
                <strong>저장한 필터</strong>
                {library.filters.map((filter) => (
                  <span key={filter.id}>
                    <button
                      type="button"
                      onClick={() => applySavedFilter(filter.query)}
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`${filter.name} 삭제`}
                      onClick={() => void deleteFilter(filter.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            </div>
          </details>
        )}

      <section
        className="product-shell community-browse"
        id="stories"
        aria-labelledby="stories-title"
        hidden={exploreMode !== "stories"}
      >
        <div className="community-controls">
          <div>
            <p className="product-eyebrow">EXPLORE STORIES</p>
            <h2 id="stories-title">{search ? `“${search}” 검색 결과` : home ? "새롭게 만나는 작품" : "작품 둘러보기"}</h2>
          </div>
          <form
            className="community-search"
            onSubmit={submitSearch}
            role="search"
          >
            <label className="sr-only" htmlFor="community-search">
              제목, 작가, 본문 검색
            </label>
            <input
              id="community-search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="제목·작가·본문 검색"
            />
            <button type="submit">검색</button>
          </form>
        </div>

        <div className="discovery-genres" role="group" aria-label="글 형식 바로 선택">
          <button type="button" aria-pressed={formats.length === 0} onClick={() => setFormats([])}>전체</button>
          {formatOptions.map(([value, label]) => <button type="button" key={value} aria-pressed={formats.length === 1 && formats[0] === value} onClick={() => setFormats([value])}>{label}</button>)}
        </div>
        <div className="discovery-toolbar">
          <label className="discovery-sort"><span className="sr-only">작품 정렬</span><select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">최신순</option><option value="recommended">추천순</option><option value="popular">좋아요순</option><option value="work-completed">완결 우선</option><option value="near-publish">출판 임박순</option><option value="purchase">구매희망순</option><option value="completion">완독순</option>
          </select></label>
          <button
            className="filter-open-button"
            type="button"
            onClick={() => setFilterOpen(true)}
          >
            필터·정렬 {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
          {(selectedLabels.length > 0 || search) && <div className="active-filter-chips">
            {selectedLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
            {(activeFilterCount > 0 || search) && (
              <button type="button" onClick={clearFilters}>
                전체 초기화
              </button>
            )}
          </div>}
          <p>
            <strong>{total}</strong>개의 작품
          </p>
          <div
            className="community-view-toggle"
            role="group"
            aria-label="작품 목록 보기 방식"
          >
            <button
              type="button"
              className={viewMode === "card" ? "is-active" : ""}
              onClick={() => changeView("card")}
              aria-pressed={viewMode === "card"}
              aria-label="카드형으로 보기"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
                <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
                <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
                <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={viewMode === "list" ? "is-active" : ""}
              onClick={() => changeView("list")}
              aria-pressed={viewMode === "list"}
              aria-label="리스트형으로 보기"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="2.5" y="3" width="3" height="3" rx=".6" />
                <path d="M8 4.5h9M8 10h9M8 15.5h9" />
                <rect x="2.5" y="8.5" width="3" height="3" rx=".6" />
                <rect x="2.5" y="14" width="3" height="3" rx=".6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`filter-sheet ${filterOpen ? "is-open" : ""}`}
          aria-hidden={!filterOpen}
          inert={!filterOpen}
        >
          <button
            className="filter-sheet-backdrop"
            type="button"
            onClick={() => setFilterOpen(false)}
            aria-label="필터 닫기"
          />
          <section
            ref={filterDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
          >
            <header>
              <div>
                <p className="product-eyebrow">SMART FILTER</p>
                <h3 id="filter-title">조건을 조합해 찾기</h3>
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </header>
            <fieldset>
              <legend>정렬</legend>
              <label className="filter-sort-field">
                <span className="sr-only">정렬 기준</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recent">최신순</option>
                  <option value="recommended">추천순</option>
                  <option value="work-completed">완결 작품 우선</option>
                  <option value="near-publish">출판 임박순</option>
                  <option value="popular">좋아요순</option>
                  <option value="purchase">구매희망순</option>
                  <option value="completion">완독순</option>
                </select>
              </label>
            </fieldset>
            <fieldset>
              <legend>주제</legend>
              <div>
                {categories.map((item) => (
                  <label
                    key={item.slug}
                    className={topics.includes(item.slug) ? "is-checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={topics.includes(item.slug)}
                      onChange={() => setTopics(toggleValue(topics, item.slug))}
                    />
                    <i style={{ background: item.color }} />
                    {item.name}
                    <small>{item.count}</small>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>글 형식</legend>
              <div>
                {formatOptions.map(([value, label]) => (
                  <label
                    key={value}
                    className={formats.includes(value) ? "is-checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={formats.includes(value)}
                      onChange={() => setFormats(toggleValue(formats, value))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>작품 상태</legend>
              <div>
                {statusOptions.map(([value, label]) => (
                  <label
                    key={value}
                    className={statuses.includes(value) ? "is-checked" : ""}
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(value)}
                      onChange={() => setStatuses(toggleValue(statuses, value))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="filter-special">
              <label>
                <input
                  type="checkbox"
                  checked={challengeOnly}
                  onChange={(e) => setChallengeOnly(e.target.checked)}
                />
                출판 도전 작품만
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={savedOnly}
                  onChange={(e) => setSavedOnly(e.target.checked)}
                />
                나중에 읽기만
              </label>
            </div>
            <footer>
              <button type="button" onClick={clearFilters}>
                조건 초기화
              </button>
              <button type="button" onClick={() => void saveFilter()}>
                조건 저장
              </button>
              <button type="button" onClick={() => setFilterOpen(false)}>
                {total}개 작품 보기
              </button>
            </footer>
          </section>
        </div>

        {message && (
          <p className="community-message" role="status">
            {message}
          </p>
        )}
        {loadError ? (
          <div className="community-error" role="alert"><strong>작품을 불러오지 못했습니다.</strong><p>{loadError}</p><button type="button" onClick={() => void loadPosts(1, false)}>다시 시도</button></div>
        ) : loading ? (
          <div
            className={`story-grid is-${viewMode} story-skeleton-grid`}
            aria-label="작품 목록 불러오는 중"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <div className="story-skeleton" key={index}>
                <span />
                <i />
                <b />
                <em />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="community-empty">
            <span aria-hidden="true">⌕</span>
            <h3>조건에 맞는 작품이 없어요.</h3>
            <p>검색어 또는 선택한 필터를 조금 줄여보세요.</p>
            <button type="button" onClick={clearFilters}>
              모든 조건 초기화
            </button>
          </div>
        ) : (
          <>
            <div className={`story-grid is-${viewMode}`}>
              {posts.map((post, index) => (
                <a
                  className="community-story-card"
                  href={`/community/${post.id}`}
                  key={post.id}
                >
                  <div
                    className="community-card-cover"
                    style={
                      { "--category-color": post.topicColor } as CSSProperties
                    }
                  >
                    {post.coverImage ? (
                      <img src={post.coverImage} alt={`${post.title} 표지`} loading="lazy" decoding="async" />
                    ) : (
                      <>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{post.title}</strong>
                      </>
                    )}
                    <i className="category-band">{post.topicName}</i>
                  </div>
                  <article>
                    <div className="story-card-meta">
                      <span>
                        {post.topicName} ·{" "}
                        {FORMAT_LABELS[post.format] || post.format}
                      </span>
                      <time>{formatDate(post.publishedAt)}</time>
                    </div>
                    <div className="story-badges">
                      <span>{STATUS_LABELS[post.workStatus] || "연재 중"}</span>
                      {post.publishChallenge && (
                        <span className="is-challenge">출판 도전</span>
                      )}
                      {post.isSaved > 0 && <span>저장됨</span>}
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.summary || post.content.slice(0, 100)}</p>
                    <div className="story-author-line">
                      <span aria-hidden="true">
                        {post.authorName.charAt(0)}
                      </span>
                      <strong>{post.authorName}</strong>
                    </div>
                    <div className="story-reaction-line" aria-label="핵심 반응">
                      <span><CardMetricIcon name="like" /> 좋아요 {post.likeCount}</span>
                      <span><CardMetricIcon name="purchase" /> 구매희망 {post.purchaseCount}</span>
                    </div>
                  </article>
                </a>
              ))}
            </div>
            {hasMore && (
              <div className="community-load-more">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadPosts(page + 1, true)}
                >
                  {loadingMore ? "불러오는 중…" : "작품 더 보기"}
                  <span>{Math.max(0, total - posts.length)}</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section
        className="product-shell community-events-browse"
        id="programs"
        aria-labelledby="programs-title"
        hidden={exploreMode !== "events"}
      >
        <div className="community-event-controls">
          <div>
            <p className="product-eyebrow">MEET & LEARN</p>
            <h2 id="programs-title">행사·강의 일정 찾기</h2>
            <p>승인된 앞으로의 일정만 표시합니다.</p>
          </div>
          <form
            className="community-event-search"
            onSubmit={submitEventSearch}
            role="search"
          >
            <label className="sr-only" htmlFor="community-event-search">
              행사, 작가, 장소 검색
            </label>
            <input
              id="community-event-search"
              value={eventSearchDraft}
              onChange={(e) => setEventSearchDraft(e.target.value)}
              placeholder="행사명·작가·장소 검색"
            />
            <button type="submit">검색</button>
          </form>
        </div>
        <div className="community-event-toolbar">
          <div role="group" aria-label="프로그램 종류">
            {[
              ["all", "전체"],
              ["lecture", "작가 강의"],
              ["popup", "팝업"],
              ["portfolio", "모임"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={eventType === value ? "is-active" : ""}
                aria-pressed={eventType === value}
                onClick={() => setEventType(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p>
            <strong>{eventTotal}</strong>개의 예정 일정
          </p>
          {(eventType !== "all" || eventSearch) && (
            <button
              type="button"
              className="event-filter-reset"
              onClick={() => {
                setEventType("all");
                setEventSearch("");
                setEventSearchDraft("");
              }}
            >
              검색 초기화
            </button>
          )}
        </div>
        {eventMessage ? (
          <div className="community-error" role="alert"><strong>행사 일정을 불러오지 못했습니다.</strong><p>{eventMessage}</p><button type="button" onClick={() => void loadEvents(1, false)}>다시 시도</button></div>
        ) : eventLoading ? (
          <div
            className="community-event-skeleton"
            aria-label="행사 일정 불러오는 중"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="community-empty">
            <span aria-hidden="true">◇</span>
            <h3>조건에 맞는 예정 일정이 없어요.</h3>
            <p>검색어나 프로그램 종류를 바꿔 보세요.</p>
            <button
              type="button"
              onClick={() => {
                setEventType("all");
                setEventSearch("");
                setEventSearchDraft("");
              }}
            >
              모든 조건 초기화
            </button>
          </div>
        ) : (
          <>
            <div className="community-event-grid">
              {events.map((event) => {
                const start = new Date(event.startsAt);
                const remaining = Math.max(
                  0,
                  event.capacity - event.applicants,
                );
                return (
                  <a
                    className="community-event-card"
                    href={`/events#event-${event.id}`}
                    key={event.id}
                  >
                    <header>
                      <span className="community-event-date">
                        <strong>{start.getDate()}</strong>
                        <small>
                          {new Intl.DateTimeFormat("ko-KR", {
                            month: "short",
                          }).format(start)}
                        </small>
                      </span>
                      <span className="community-event-type">
                        {EVENT_LABELS[event.type] || event.type}
                      </span>
                    </header>
                    <h3>{event.title}</h3>
                    <p>{event.summary}</p>
                    <dl>
                      <div>
                        <dt>일정</dt>
                        <dd>
                          {start.toLocaleString("ko-KR", {
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt>진행</dt>
                        <dd>
                          {event.ownerName} · {event.venue}
                        </dd>
                      </div>
                    </dl>
                    <footer>
                      <span>
                        {remaining > 0
                          ? `남은 자리 ${remaining}석`
                          : "신청 마감"}{" "}
                        ·{" "}
                        {event.fee
                          ? `${event.fee.toLocaleString("ko-KR")}원`
                          : "무료"}
                      </span>
                      <strong>
                        {event.applied ? "신청 확인 →" : "자세히·신청 →"}
                      </strong>
                    </footer>
                  </a>
                );
              })}
            </div>
            {eventHasMore && (
              <div className="community-load-more">
                <button
                  type="button"
                  disabled={eventLoadingMore}
                  onClick={() => void loadEvents(eventPage + 1, true)}
                >
                  {eventLoadingMore ? "불러오는 중…" : "일정 더 보기"}
                  <span>{Math.max(0, eventTotal - events.length)}</span>
                </button>
              </div>
            )}
          </>
        )}
        <aside className="community-event-footer">
          <div>
            <strong>직접 강의나 모임을 열고 싶은 작가인가요?</strong>
            <p>
              작가 스튜디오에서 프로그램을 신청하면 운영진 승인 후 탐색에
              공개됩니다.
            </p>
          </div>
          <a href="/studio">행사 신청하기 →</a>
        </aside>
      </section>
      <footer className="discovery-footer product-shell"><a href="/about">GROW BOOK 소개</a><a href="/rankings">랭킹·출판 후보</a><a href="/challenges">출판 프로젝트</a><a href="/impact">사회공헌</a><a href="/?guide=1">이용 안내</a><span>한 편의 글이, 한 권의 책으로.</span></footer>
    </main>
  );
}
