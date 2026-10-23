"use client";
/* eslint-disable @next/next/no-img-element -- user-uploaded profile images are served from the site image endpoint */

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Data = {
  username: string;
  profile: {
    displayName: string;
    profileImage: string;
    headline: string;
    bio: string;
    interests: string;
    portfolioPublic: boolean;
  };
  bookmarks: { id: number; title: string }[];
  follows: number;
  reports: number;
};

export default function AccountClient({
  initialName,
  embedded = false,
  isDemo = false,
}: {
  initialName: string;
  embedded?: boolean;
  isDemo?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [name, setName] = useState(initialName);
  const [profileImage, setProfileImage] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [portfolioPublic, setPortfolioPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as Data & { error?: string };
        if (!response.ok)
          throw new Error(result.error || "마이페이지를 불러오지 못했습니다.");
        setData(result);
        setName(result.profile.displayName);
        setProfileImage(result.profile.profileImage || "");
        setHeadline(result.profile.headline || "");
        setBio(result.profile.bio || "");
        setInterests(result.profile.interests || "");
        setPortfolioPublic(result.profile.portfolioPublic !== false);
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "마이페이지를 불러오지 못했습니다.",
        ),
      );
  }, []);

  async function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "profile");
      const response = await fetch("/api/uploads/covers", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url)
        throw new Error(
          result.error || "프로필 이미지를 업로드하지 못했습니다.",
        );
      setProfileImage(result.url);
      setMessage(
        "프로필 이미지를 불러왔습니다. 아래 저장하기를 눌러 적용해 주세요.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "프로필 이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        profileImage,
        headline,
        bio,
        interests,
        portfolioPublic,
      }),
    });
    setMessage(
      response.ok ? "마이페이지 정보를 저장했습니다." : "저장하지 못했습니다.",
    );
  }

  return (
    <section className={`account-page product-shell ${embedded ? "is-embedded" : ""}`}>
      {!embedded && <section className="account-hero">
        <p className="product-eyebrow">MY GROW BOOK</p>
        <h1>마이페이지</h1>
        <p>
          내 프로필과 작가 소개를 관리하고, 저장한 작품과 최근 활동을 한곳에서
          확인하세요.
        </p>
      </section>}

      <div className="account-grid">
        {isDemo && <p className="account-demo-note" role="note"><strong>체험 프로필</strong> 저장 동작은 정상적으로 확인할 수 있지만 정식 계정으로 자동 이전되지는 않습니다.</p>}
        <form className="account-card profile-settings-card" onSubmit={save}>
          <header>
            <div>
              <p className="product-eyebrow">PROFILE</p>
              <h2>내 프로필 관리</h2>
            </div>
            <span>공개 작가 페이지에 반영됩니다.</span>
          </header>
          <div className="account-profile-image-editor">
            <div
              className="account-profile-image"
              role="img"
              aria-label={`${name || "작가"} 프로필 이미지`}
            >
              {profileImage ? (
                <img src={profileImage} alt="" />
              ) : (
                <span>{(name || "G").charAt(0)}</span>
              )}
            </div>
            <div>
              <strong>프로필 이미지</strong>
              <small>
                정사각형 이미지를 권장하며 JPG·PNG·WEBP·GIF, 최대 4MB까지
                가능합니다.
              </small>
              <div>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={uploadProfileImage}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => imageInput.current?.click()}
                >
                  {uploading ? "업로드 중…" : "프로필 이미지 선택"}
                </button>
                {profileImage && (
                  <button type="button" onClick={() => setProfileImage("")}>
                    기본 이미지로 변경
                  </button>
                )}
              </div>
            </div>
          </div>

          <label>
            표시 이름
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
            />
          </label>
          <label>
            한 줄 소개
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              maxLength={100}
              placeholder="어떤 이야기를 쓰는 작가인지 소개해 주세요"
            />
          </label>
          <label>
            상세 소개
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={300}
              placeholder="독자에게 전하고 싶은 작가 소개를 작성해 주세요."
            />
          </label>
          <label>
            관심 분야
            <input
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              maxLength={150}
              placeholder="사랑, 성장, 에세이"
            />
          </label>
          <label className="profile-public-toggle">
            <input
              type="checkbox"
              checked={portfolioPublic}
              onChange={(event) => setPortfolioPublic(event.target.checked)}
            />
            <span>작가 프로필과 포트폴리오 공개</span>
          </label>
          <button
            className="product-button product-button-primary"
            disabled={uploading}
          >
            저장하기
          </button>
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          {data && portfolioPublic && (
            <a
              className="portfolio-preview-link"
              href={`/writers/${encodeURIComponent(data.username || "guest")}`}
            >
              내 공개 작가 페이지 보기 →
            </a>
          )}
        </form>

        <section className="account-card account-activity-card">
          <header>
            <div>
              <p className="product-eyebrow">ACTIVITY</p>
              <h2>내 활동</h2>
            </div>
          </header>
          <div className="account-stats">
            <span>
              <strong>{data?.follows || 0}</strong>팔로잉
            </span>
            <span>
              <strong>{data?.bookmarks.length || 0}</strong>북마크
            </span>
            <span>
              <strong>{data?.reports || 0}</strong>신고 접수
            </span>
          </div>
          <a className="notification-account-link" href="/notifications">
            새 반응과 알림 확인하기 →
          </a>
          <h3>나중에 읽을 작품</h3>
          {data?.bookmarks.length ? (
            data.bookmarks.map((post) => (
              <a key={post.id} href={`/community/${post.id}`}>
                {post.title} →
              </a>
            ))
          ) : (
            <p className="account-empty">아직 저장한 작품이 없습니다.</p>
          )}
        </section>
      </div>
    </section>
  );
}
