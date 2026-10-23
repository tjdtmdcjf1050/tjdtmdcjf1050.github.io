import type { Metadata } from "next";
import "./globals.css";
import "./product.css";
import "./simple-ui.css";
import "./refinement.css";
import "./commercial.css";
import "./discovery.css";
import "./library-ui.css";
import AppEnhancements from "./components/AppEnhancements";
import ActionDialogProvider from "./components/ActionDialogProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://grow-book.tjdtmdcjf1050.chatgpt.site"),
  title: {
    default: "GROW BOOK | 이야기가 책으로 자라는 곳",
    template: "%s | GROW BOOK",
  },
  description:
    "누구나 자유롭게 쓰고, 독자의 공감으로 가능성을 발견하며, 실제 출판까지 함께하는 참여형 스토리 플랫폼 GROW BOOK.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "GROW BOOK",
    title: "GROW BOOK | 이야기가 책으로 자라는 곳",
    description:
      "쓰고, 읽고, 독자의 선택으로 출판 가능성을 발견하는 참여형 스토리 플랫폼.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GROW BOOK | 이야기가 책으로 자라는 곳",
    description: "한 편의 글이 한 권의 책으로 자라는 곳.",
  },
  icons: {
    icon: "/grow-book-logo.png",
    shortcut: "/grow-book-logo.png",
    apple: "/grow-book-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="simple-ui">
        <ActionDialogProvider>
          {children}
          <AppEnhancements />
        </ActionDialogProvider>
      </body>
    </html>
  );
}
