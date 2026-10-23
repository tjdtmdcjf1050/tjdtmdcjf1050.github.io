"use client";
/* eslint-disable @next/next/no-img-element -- user profile images are served from the site image endpoint */
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
type Work = {
  id: number;
  title: string;
  summary: string;
  topicName: string;
  topicColor: string;
  format: string;
  workStatus: string;
  publishChallenge: boolean;
  candidateStatus: string | null;
  publishedAt: string;
  likeCount: number;
  purchaseCount: number;
  recommendCount: number;
};
type Writer = {
  username: string;
  displayName: string;
  profileImage: string;
  headline: string;
  bio: string;
  interests: string;
  followers: number;
  totals: { likes: number; purchases: number; recommends: number };
  badges: string[];
};
const format: Record<string, string> = {
    novel: "소설",
    essay: "에세이",
    poetry: "시",
    prose: "산문",
    other: "기타",
  },
  status: Record<string, string> = {
    preparing: "준비 중",
    ongoing: "연재 중",
    completed: "완결",
    paused: "휴재",
  };
export default function WriterClient({ username }: { username: string }) {
  const [writer, setWriter] = useState<Writer | null>(null),
    [works, setWorks] = useState<Work[]>([]),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch(`/api/writers/${encodeURIComponent(username)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json()) as {
          writer: Writer;
          works: Work[];
          error?: string;
        };
        if (!r.ok) throw new Error(d.error);
        setWriter(d.writer);
        setWorks(d.works);
      })
      .catch((e) =>
        setMessage(
          e instanceof Error ? e.message : "작가 정보를 불러오지 못했습니다.",
        ),
      )
      .finally(() => setLoading(false));
  }, [username]);
  if (loading)
    return (
      <main className="community-loading">
        <span />
        작가의 서재를 펼치고 있습니다.
      </main>
    );
  if (!writer)
    return (
      <main className="story-detail-error">
        <h1>작가 페이지를 표시할 수 없습니다.</h1>
        <p>{message}</p>
        <Link href="/community">둘러보기로 돌아가기</Link>
      </main>
    );
  return (
    <main className="writer-page">
      <section className="writer-hero">
        <div className="product-shell writer-hero-grid">
          <div className="writer-avatar">
            {writer.profileImage ? (
              <img src={writer.profileImage} alt="" />
            ) : (
              writer.displayName.charAt(0)
            )}
          </div>
          <div>
            <p className="product-eyebrow">WRITER PORTFOLIO</p>
            <h1>{writer.displayName}</h1>
            <strong>{writer.headline}</strong>
            <p>{writer.bio}</p>
            <div className="writer-badges">
              {writer.badges.map((item) => (
                <span key={item}>✦ {item}</span>
              ))}
            </div>
          </div>
          <aside>
            <span>
              <strong>{works.length}</strong>공개 작품
            </span>
            <span>
              <strong>{writer.followers}</strong>팔로워
            </span>
            <span>
              <strong>{writer.totals.purchases}</strong>구매희망
            </span>
            <span>
              <strong>{writer.totals.recommends}</strong>추천
            </span>
          </aside>
        </div>
      </section>
      <section className="product-shell writer-works">
        <header>
          <div>
            <p className="product-eyebrow">WRITER&apos;S LIBRARY</p>
            <h2>작품과 성장 기록</h2>
          </div>
          {writer.interests && <p>관심 분야 · {writer.interests}</p>}
        </header>
        {works.length ? (
          <div className="writer-work-grid">
            {works.map((work) => (
              <Link href={`/community/${work.id}`} key={work.id}>
                <div style={{ "--category-color": work.topicColor } as CSSProperties}>
                  <span>{work.topicName}</span>
                  <strong>{format[work.format] || "작품"}</strong>
                  <i className="category-band">{work.topicName}</i>
                </div>
                <article>
                  <div className="story-badges">
                    <span>{status[work.workStatus] || "연재 중"}</span>
                    {work.publishChallenge && (
                      <span className="is-challenge">출판 도전</span>
                    )}
                  </div>
                  <h3>{work.title}</h3>
                  <p>{work.summary}</p>
                  <footer>
                    <span>♥ {work.likeCount}</span>
                    <span>▣ {work.purchaseCount}</span>
                    <span>↗ {work.recommendCount}</span>
                  </footer>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="community-empty">
            <span>✎</span>
            <h3>아직 공개한 작품이 없습니다.</h3>
          </div>
        )}
      </section>
    </main>
  );
}
