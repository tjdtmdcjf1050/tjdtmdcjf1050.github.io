"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionDialog } from "../components/ActionDialogProvider";
type EventItem = {
  id: number;
  ownerName: string;
  type: string;
  title: string;
  summary: string;
  venue: string;
  startsAt: string;
  capacity: number;
  fee: number;
  status: string;
  applicants: number;
  applied: number;
};
const labels: Record<string, string> = {
  lecture: "작가 강의",
  popup: "팝업 행사",
  portfolio: "포트폴리오 모임",
};
async function getJson<T>(r: Response): Promise<T> {
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || "요청을 처리하지 못했습니다.");
  return d;
}
export default function EventsClient() {
  const { confirmAction } = useActionDialog();
  const [events, setEvents] = useState<EventItem[]>([]),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(
        (
          await fetch("/api/events?limit=60", { cache: "no-store" }).then((r) =>
            getJson<{ events: EventItem[] }>(r),
          )
        ).events,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "일정을 불러오지 못했습니다.",
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
    if (loading || events.length === 0 || !location.hash.startsWith("#event-"))
      return;
    const timer = setTimeout(
      () =>
        document
          .querySelector(location.hash)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
    return () => clearTimeout(timer);
  }, [events, loading]);
  const visible = useMemo(
    () => events.filter((event) => filter === "all" || event.type === filter),
    [events, filter],
  );
  async function apply(event: EventItem) {
    const action = event.applied ? "cancel" : "apply";
    if (event.applied && !(await confirmAction({
      title: "참가 신청 취소",
      message: "참가 신청을 취소할까요? 취소한 자리는 다른 참여자에게 열립니다.",
      confirmLabel: "신청 취소",
      danger: true,
    }))) return;
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action }),
      }).then((r) => getJson(r));
      setMessage(
        action === "apply"
          ? "참가 신청이 완료되었습니다."
          : "참가 신청을 취소했습니다.",
      );
      await load();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "신청을 처리하지 못했습니다.",
      );
    }
  }
  return (
    <main className="events-page">
      <section className="events-hero">
        <div className="product-shell">
          <p className="product-eyebrow">MEET BEYOND THE PAGE</p>
          <h1>
            문장 밖에서
            <br />
            작가와 독자가 만납니다.
          </h1>
          <p>작가 강의, 출판 팝업, 참여형 포트폴리오 모임에 신청해 보세요.</p>
        </div>
      </section>
      <section className="product-shell events-content">
        <header>
          <div>
            <p className="product-eyebrow">UPCOMING PROGRAMS</p>
            <h2>다가오는 프로그램</h2>
          </div>
          <div>
            {[
              ["all", "전체"],
              ["lecture", "강의"],
              ["popup", "팝업"],
              ["portfolio", "포트폴리오"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "is-active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        {message && (
          <p className="events-message" role="status">
            {message}
          </p>
        )}
        {loading ? (
          <div className="events-loading">
            <span />
            일정을 확인하고 있습니다.
          </div>
        ) : visible.length === 0 ? (
          <div className="studio-empty">
            <span>◇</span>
            <h3>예정된 프로그램이 없습니다.</h3>
            <p>새 일정이 승인되면 이곳에 가장 먼저 표시됩니다.</p>
          </div>
        ) : (
          <div className="events-grid">
            {visible.map((event) => {
              const full = event.applicants >= event.capacity;
              return (
                <article id={`event-${event.id}`} key={event.id}>
                  <div className="event-date">
                    <strong>{new Date(event.startsAt).getDate()}</strong>
                    <span>
                      {new Intl.DateTimeFormat("ko-KR", {
                        month: "short",
                      }).format(new Date(event.startsAt))}
                    </span>
                  </div>
                  <span className="event-type">
                    {labels[event.type] || event.type}
                  </span>
                  <h3>{event.title}</h3>
                  <p>{event.summary}</p>
                  <dl>
                    <div>
                      <dt>작가</dt>
                      <dd>{event.ownerName}</dd>
                    </div>
                    <div>
                      <dt>일정</dt>
                      <dd>
                        {new Date(event.startsAt).toLocaleString("ko-KR")}
                      </dd>
                    </div>
                    <div>
                      <dt>장소</dt>
                      <dd>{event.venue}</dd>
                    </div>
                    <div>
                      <dt>참가비</dt>
                      <dd>
                        {event.fee
                          ? event.fee.toLocaleString("ko-KR") + "원"
                          : "무료"}
                      </dd>
                    </div>
                  </dl>
                  <div className="event-capacity">
                    <span>
                      신청 {event.applicants}/{event.capacity}명
                    </span>
                    <i>
                      <b
                        style={{
                          width: `${Math.min(100, (event.applicants / event.capacity) * 100)}%`,
                        }}
                      />
                    </i>
                  </div>
                  <button
                    disabled={full && !event.applied}
                    className={event.applied ? "is-applied" : ""}
                    onClick={() => void apply(event)}
                  >
                    {event.applied
                      ? "신청 취소"
                      : full
                        ? "신청 마감"
                        : "참가 신청 →"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <aside className="writer-event-cta">
          <div>
            <strong>직접 강의나 모임을 열고 싶은 작가인가요?</strong>
            <p>
              작가 스튜디오에서 프로그램을 신청하면 운영진 검토 후 공개됩니다.
            </p>
          </div>
          <a href="/studio">작가 행사 신청하기 →</a>
        </aside>
      </section>
    </main>
  );
}
