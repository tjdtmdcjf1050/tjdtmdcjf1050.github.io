"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useActionDialog } from "../components/ActionDialogProvider";

type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
};

type Post = {
  id: number;
  title: string;
  summary: string;
  content: string;
  status: "draft" | "published";
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  updatedAt: string;
  publishedAt: string | null;
};

const COLOR_OPTIONS = ["#d9ff54", "#ff835c", "#a9c9b3", "#ffb3a0", "#b8b5ff"];

async function getJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function DashboardClient({ displayName }: { displayName: string }) {
  const { confirmAction } = useActionDialog();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [postData, categoryData] = await Promise.all([
        fetch("/api/posts", { cache: "no-store" }).then((response) =>
          getJson<{ posts: Post[] }>(response),
        ),
        fetch("/api/categories", { cache: "no-store" }).then((response) =>
          getJson<{ categories: Category[] }>(response),
        ),
      ]);
      setPosts(postData.posts);
      setCategories(categoryData.categories);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredPosts = useMemo(
    () => posts.filter((post) => filter === "all" || post.status === filter),
    [filter, posts],
  );

  const publishedCount = posts.filter((post) => post.status === "published").length;
  const draftCount = posts.length - publishedCount;

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, color: categoryColor }),
      }).then((response) => getJson<{ category: Category }>(response));
      setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name, "ko")));
      setCategoryName("");
      setMessage("새 카테고리를 만들었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카테고리를 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!(await confirmAction({
      title: "카테고리 삭제",
      message: `‘${category.name}’ 카테고리를 삭제할까요?`,
      confirmLabel: "삭제",
      danger: true,
    }))) return;
    setBusy(true);
    setMessage("");
    try {
      await fetch(`/api/categories/${category.id}`, { method: "DELETE" }).then((response) =>
        getJson<{ deleted: boolean }>(response),
      );
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setMessage("카테고리를 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카테고리를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(post: Post) {
    if (!(await confirmAction({
      title: "글 삭제",
      message: `‘${post.title}’ 글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      confirmLabel: "삭제",
      danger: true,
    }))) return;
    setBusy(true);
    setMessage("");
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" }).then((response) =>
        getJson<{ deleted: boolean }>(response),
      );
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setMessage("글을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "글을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="product-main">
      <section className="product-shell dashboard-hero" aria-labelledby="dashboard-title">
        <div>
          <p className="product-eyebrow">MY GROW BOOK</p>
          <h1 id="dashboard-title">안녕하세요, {displayName}님.<br />오늘은 어떤 이야기를 키워볼까요?</h1>
        </div>
        <a className="product-button product-button-primary" href="/write">
          새 글 쓰기 <span aria-hidden="true">＋</span>
        </a>
      </section>

      <section className="product-shell dashboard-stats" aria-label="내 글 현황">
        <article><span>전체 글</span><strong>{posts.length}</strong><small>ALL STORIES</small></article>
        <article><span>임시저장</span><strong>{draftCount}</strong><small>DRAFTS</small></article>
        <article><span>발행 완료</span><strong>{publishedCount}</strong><small>PUBLISHED</small></article>
        <article><span>카테고리</span><strong>{categories.length}</strong><small>CATEGORIES</small></article>
      </section>

      {message && <p className="product-message" role="status">{message}</p>}

      <div className="product-shell dashboard-grid">
        <section className="library-panel" aria-labelledby="library-title">
          <div className="panel-heading-row">
            <div>
              <p className="product-eyebrow">MY LIBRARY</p>
              <h2 id="library-title">내가 쓴 글</h2>
            </div>
            <div className="filter-tabs" role="group" aria-label="글 상태 필터">
              {(["all", "draft", "published"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "is-active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {value === "all" ? "전체" : value === "draft" ? "임시저장" : "발행"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><span className="loading-dot" />글을 불러오고 있습니다.</div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">✎</span>
              <h3>아직 이곳에 글이 없어요.</h3>
              <p>첫 문장을 기록하면 당신의 서재가 시작됩니다.</p>
              <a href="/write">첫 글 쓰기 →</a>
            </div>
          ) : (
            <div className="post-list">
              {filteredPosts.map((post) => (
                <article className="post-row" key={post.id}>
                  <div className="post-category-mark" style={{ backgroundColor: post.categoryColor }} aria-hidden="true" />
                  <div className="post-row-content">
                    <div className="post-meta">
                      <span className={`status-badge status-${post.status}`}>
                        {post.status === "published" ? "발행" : "임시저장"}
                      </span>
                      <span>{post.categoryName}</span>
                      <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.summary || post.content.slice(0, 100)}</p>
                  </div>
                  <div className="post-actions">
                    <a href={`/write?id=${post.id}`}>수정</a>
                    <button type="button" disabled={busy} onClick={() => void deletePost(post)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="category-panel" id="categories" aria-labelledby="category-title">
          <p className="product-eyebrow">CATEGORY SETTING</p>
          <h2 id="category-title">카테고리 설정</h2>
          <p>내 글을 구분할 카테고리를 만들고 관리하세요.</p>

          <form className="category-form" onSubmit={createCategory}>
            <label htmlFor="category-name">새 카테고리 이름</label>
            <div className="category-input-row">
              <input
                id="category-name"
                value={categoryName}
                maxLength={24}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="예: 여행 에세이"
              />
              <button type="submit" disabled={busy || !categoryName.trim()} aria-label="카테고리 추가">＋</button>
            </div>
            <fieldset className="color-picker">
              <legend>표시 색상</legend>
              {COLOR_OPTIONS.map((color) => (
                <label key={color} style={{ backgroundColor: color }}>
                  <input
                    type="radio"
                    name="category-color"
                    value={color}
                    checked={categoryColor === color}
                    onChange={() => setCategoryColor(color)}
                  />
                  <span className="sr-only">{color}</span>
                </label>
              ))}
            </fieldset>
          </form>

          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <span className="category-color" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <span>{category.name}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteCategory(category)}
                  aria-label={`${category.name} 카테고리 삭제`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
