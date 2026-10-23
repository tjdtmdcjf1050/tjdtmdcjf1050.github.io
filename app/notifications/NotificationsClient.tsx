"use client";

import { useEffect, useState } from "react";

type Notice = {
  id: number;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsClient() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { notifications: Notice[]; error?: string };
        if (!response.ok) throw new Error(data.error || "알림을 불러오지 못했습니다.");
        if (active) setItems(data.notifications);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "알림을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function read(id: number, href: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    if (href) window.location.assign(href);
  }

  async function readAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  }

  return (
    <main className="notification-page product-shell">
      <header>
        <div>
          <p className="product-eyebrow">MY NOTIFICATIONS</p>
          <h1>새로운 반응과 소식</h1>
          <p>작품 반응, 댓글, 출판 후보와 프로젝트 소식을 한곳에서 확인하세요.</p>
        </div>
        <button onClick={() => void readAll()} disabled={!items.some((item) => !item.readAt)}>모두 읽음</button>
      </header>
      {message && <p className="community-message" role="alert">{message}</p>}
      {loading ? (
        <div className="community-loading"><span />알림을 불러오고 있습니다.</div>
      ) : items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <button key={item.id} className={item.readAt ? "is-read" : "is-unread"} onClick={() => void read(item.id, item.href)}>
              <span>{item.type.includes("purchase") ? "▣" : item.type === "comment" ? "✎" : item.type === "sponsorship" ? "✦" : "●"}</span>
              <div><strong>{item.title}</strong><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString("ko-KR")}</time></div>
              {!item.readAt && <i />}
            </button>
          ))}
        </div>
      ) : (
        <div className="community-empty"><span>✦</span><h3>새로운 알림이 없습니다.</h3><p>작품에 반응이 도착하면 이곳에서 알려드릴게요.</p></div>
      )}
    </main>
  );
}
