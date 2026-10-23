"use client";
/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages -- validated covers and plain hosted-runtime links */

import { useEffect, useState, type CSSProperties } from "react";

type HomeStory = {
  id: number;
  title: string;
  summary: string;
  authorName: string;
  topicName: string;
  topicSlug: string;
  topicColor: string;
  format: string;
  coverImage: string;
  likeCount: number;
  purchaseCount: number;
};

type HomeCategory = {
  name: string;
  slug: string;
  color: string;
  count: number;
};

const FORMAT_LABELS: Record<string, string> = {
  novel: "소설",
  essay: "에세이",
  poetry: "시",
  prose: "산문",
  other: "기타",
};

export default function HomeDiscoveryClient() {
  const [stories, setStories] = useState<HomeStory[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/community?sort=recommended&page=1&limit=6", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          posts?: HomeStory[];
          categories?: HomeCategory[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error || "작품을 불러오지 못했습니다.");
        setStories(data.posts || []);
        setCategories(data.categories || []);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(
          reason instanceof Error
            ? reason.message
            : "작품을 불러오지 못했습니다.",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section className="home-library" aria-labelledby="home-library-title">
      <div className="container">
        <header className="home-section-heading">
          <div>
            <p className="eyebrow">READER&apos;S PICK</p>
            <h2 id="home-library-title">독자가 지금 발견한 이야기</h2>
            <p>완독·추천·구매희망 등 실제 독자 반응을 함께 살펴보세요.</p>
          </div>
          <a href="/community">전체 작품 보기</a>
        </header>

        {categories.length > 0 && (
          <nav className="home-category-chips" aria-label="카테고리 바로가기">
            <a href="/community">전체</a>
            {categories.slice(0, 6).map((category) => (
              <a
                href={`/community?topics=${encodeURIComponent(category.slug)}`}
                key={category.slug}
                style={
                  { "--category-color": category.color } as CSSProperties
                }
              >
                <i aria-hidden="true" />
                {category.name}
                <small>{category.count}</small>
              </a>
            ))}
          </nav>
        )}

        {loading ? (
          <div
            className="home-book-grid home-book-skeleton"
            aria-label="추천 작품 불러오는 중"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="home-library-state" role="alert">
            <strong>추천 작품을 불러오지 못했습니다.</strong>
            <p>{error}</p>
            <a href="/community">작품 둘러보기</a>
          </div>
        ) : stories.length === 0 ? (
          <div className="home-library-state">
            <strong>첫 번째 이야기를 기다리고 있어요.</strong>
            <p>작품을 공개하면 이곳에서 새로운 독자를 만날 수 있습니다.</p>
            <a href="/write">첫 작품 쓰기</a>
          </div>
        ) : (
          <div className="home-book-grid">
            {stories.map((story, index) => (
              <a href={`/community/${story.id}`} key={story.id}>
                <span
                  className="home-book-cover"
                  style={
                    { "--category-color": story.topicColor } as CSSProperties
                  }
                >
                  {story.coverImage ? (
                    <img src={story.coverImage} alt={`${story.title} 표지`} />
                  ) : (
                    <>
                      <small>
                        GROW BOOK · {String(index + 1).padStart(2, "0")}
                      </small>
                      <strong>{story.title}</strong>
                      <em>{story.authorName}</em>
                    </>
                  )}
                  <i>{story.topicName}</i>
                </span>
                <span className="home-book-copy">
                  <small>
                    {story.topicName} · {FORMAT_LABELS[story.format] || "작품"}
                  </small>
                  <strong>{story.title}</strong>
                  <span>{story.authorName}</span>
                  <em>
                    좋아요 {story.likeCount} · 구매희망 {story.purchaseCount}
                  </em>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
