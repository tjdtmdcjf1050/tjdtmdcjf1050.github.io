import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("responsive refinement covers all required viewport bands", async () => {
  const css = await readFile(new URL("../app/refinement.css", import.meta.url), "utf8");
  for (const marker of ["max-width: 767px", "min-width: 768px", "min-width: 1024px", "min-width: 1440px"]) {
    assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /\.discovery-toolbar\s*\{[\s\S]*top:\s*4rem/);
  assert.match(css, /\.editor-toolbar\s*\{[\s\S]*top:\s*var\(--gb-app-header-height\)/);
});

test("editor autosave uses a draft intent and explicit version guards", async () => {
  const editor = await readFile(new URL("../app/write/EditorClient.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  assert.match(editor, /savePost\("autosave",true\)/);
  assert.match(editor, /baseVersion:versionRef\.current/);
  assert.match(editor, /baseDraftVersion:draftVersionRef\.current/);
  assert.match(editor, /saveQueue\.current\.then/);
  assert.match(editor, /saveQueue\.current=task\.catch/);
  assert.match(editor, /변경사항 공개/);
  assert.match(editor, /정상적으로 저장되었습니다\./);
  assert.match(editor, /정상적으로 발행되었습니다\./);
  assert.match(editor, /publish-success-dialog/);
  assert.match(css, /\.simple-ui \.publish-success-backdrop\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*display:\s*grid;[^}]*place-items:\s*center;/s);
  assert.doesNotMatch(editor, /savePost\(savedStatus,true\)/);
});

test("cover upload and reader use validated book-shaped presentation", async () => {
  const editor = await readFile(new URL("../app/write/EditorClient.tsx", import.meta.url), "utf8");
  const reader = await readFile(new URL("../app/community/[id]/StoryDetailClient.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  assert.match(editor, /form\.append\("purpose","cover"\)/);
  assert.match(editor, /표지 업로드가 완료되었습니다/);
  assert.match(reader, /detail-cover-frame/);
  assert.match(reader, /detail-intro-copy/);
  assert.match(css, /aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(css, /object-fit:\s*cover/);
});

test("reader content, reactions and utility actions share one centered layout axis", async () => {
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  assert.match(css, /\.simple-ui \.story-reader\s*\{[^}]*width:\s*min\(100%,50rem\);[^}]*margin:\s*1rem auto 0;/s);
  assert.match(css, /\.simple-ui \.detail-publication-panel\s*\{[^}]*width:\s*min\(100%,50rem\);[^}]*margin:\s*1rem auto 0;/s);
  assert.match(css, /\.simple-ui \.reaction-bar\s*\{[^}]*margin-top:\s*1rem;[^}]*grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\);/s);
  assert.match(css, /\.simple-ui \.reaction-bar button\s*\{[^}]*grid-template-columns:\s*1\.2rem minmax\(0,1fr\) auto;/s);
  assert.match(css, /\.simple-ui \.story-utility\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,minmax\(7rem,1fr\)\);/s);
  assert.match(css, /@media screen and \(max-width:767px\)[\s\S]*\.simple-ui \.story-utility\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\);/);
});

test("commercial UI layer preserves accessible controls and responsive layouts", async () => {
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  const libraryCss = await readFile(new URL("../app/library-ui.css", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const logo = await readFile(new URL("../public/grow-book-logo.png", import.meta.url));
  assert.match(layout, /commercial\.css/);
  assert.match(layout, /library-ui\.css/);
  assert.match(layout, /grow-book-logo\.png/);
  assert.match(css, /url\("\/grow-book-logo\.png"\)/);
  assert.ok(logo.length > 0);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width:\s*767px/);
  assert.match(css, /min-width:\s*1440px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(libraryCss, /--gb-book-ivory/);
  assert.match(libraryCss, /--category-color/);
  assert.match(libraryCss, /\.home-purpose-panel/);
  assert.match(libraryCss, /\.home-book-cover/);
  assert.match(libraryCss, /\.community-card-cover/);
  for (const marker of ["max-width: 767px", "min-width: 768px", "min-width: 1024px", "min-width: 1440px"]) {
    assert.match(libraryCss, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("homepage uses one proportional spacing rhythm across every section", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/library-ui.css", import.meta.url), "utf8");
  assert.match(page, /<main className="home-page" id="main-content">/);
  assert.match(css, /--home-space-xl:\s*clamp\(/);
  assert.match(css, /\.home-page \.value-list li\s*\{[\s\S]*grid-template-columns:\s*2rem minmax\(0, 1fr\) 2\.6rem;/);
  assert.match(css, /\.home-page > \.impact-section\s*\{[\s\S]*padding-block:\s*var\(--home-space-md\) var\(--home-space-xl\);/);
  for (const marker of ["max-width: 1023px", "max-width: 767px", "min-width: 1440px"]) {
    assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("publishing journey exposes all four interactive bookshelf steps", async () => {
  const page = await readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8");
  const script = await readFile(new URL("../public/script.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  assert.match(page, /4 STEP BOOKSHELF/);
  assert.match(page, /01부터 04까지 모두 선택할 수 있어요/);
  assert.equal((page.match(/data-journey-step/g) ?? []).length, 4);
  assert.match(page, /data-active-step="01"/);
  assert.equal((page.match(/<span \/>/g) ?? []).length >= 4, true);
  assert.match(script, /data-active-step/);
  assert.match(css, /\.journey-tabs button\[aria-selected="true"\]/);
  assert.match(css, /grid-template-rows:\s*repeat\(4/);
});

test("impact artwork uses two complete portrait book covers inside its safe area", async () => {
  const css = await readFile(new URL("../app/commercial.css", import.meta.url), "utf8");
  assert.match(css, /\.impact-art\s*\{[\s\S]*min-height:\s*clamp\(26rem,32vw,30rem\)/);
  assert.match(css, /\.impact-book\s*\{[\s\S]*width:\s*30%[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(css, /\.impact-book-one\s*\{[\s\S]*left:\s*18%[\s\S]*translateY\(-48%\) rotate\(-3deg\)/);
  assert.match(css, /\.impact-book-two\s*\{[\s\S]*right:\s*18%[\s\S]*translateY\(-48%\) rotate\(3deg\)/);
});

test("commercial member actions require a real session rather than a shared guest", async () => {
  const auth = await readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8");
  const apiUtils = await readFile(new URL("../app/api/utils.ts", import.meta.url), "utf8");
  assert.doesNotMatch(auth, /guest@growbook\.test|TEST_USER/);
  assert.match(auth, /redirect\(chatGPTSignInPath\(returnTo\)\)/);
  assert.match(apiUtils, /getSessionUser/);
});

test("public event discovery stays readable while applications require sign-in", async () => {
  const events = await readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8");
  const [publicRead, memberWrite] = events.split("export async function POST");
  assert.match(publicRead, /getChatGPTUser/);
  assert.doesNotMatch(publicRead, /if \(auth\.error\)/);
  assert.match(memberWrite, /requireApiUser/);
});

test("modal surfaces provide focus trapping, escape close and hidden-state inertness", async () => {
  const hook = await readFile(new URL("../app/use-modal-focus.ts", import.meta.url), "utf8");
  const community = await readFile(new URL("../app/community/CommunityClient.tsx", import.meta.url), "utf8");
  assert.match(hook, /event\.key === "Escape"/);
  assert.match(hook, /event\.key !== "Tab"/);
  assert.match(community, /inert=\{!filterOpen\}/);
});

test("destructive and text-entry actions use the accessible service dialog", async () => {
  const provider = await readFile(
    new URL("../app/components/ActionDialogProvider.tsx", import.meta.url),
    "utf8",
  );
  const targets = [
    "../app/write/EditorClient.tsx",
    "../app/studio/StudioClient.tsx",
    "../app/community/CommunityClient.tsx",
    "../app/community/[id]/StoryDetailClient.tsx",
    "../app/events/EventsClient.tsx",
  ];
  assert.match(provider, /aria-modal="true"/);
  assert.match(provider, /useModalFocus/);
  for (const target of targets) {
    const source = await readFile(new URL(target, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:window\.)?(?:confirm|prompt)\(/);
  }
});

test("sign-in endpoints are rate limited and admin sessions require a secret", async () => {
  const login = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  const signup = await readFile(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
  const adminLogin = await readFile(new URL("../app/api/admin/login/route.ts", import.meta.url), "utf8");
  const adminAuth = await readFile(new URL("../app/admin-auth.ts", import.meta.url), "utf8");
  for (const source of [login, signup, adminLogin]) {
    assert.match(source, /checkAttemptLimit/);
    assert.match(source, /recordFailedAttempt/);
  }
  assert.match(adminAuth, /ADMIN_SESSION_SECRET/);
  assert.match(adminAuth, /length < 32/);
});

test("trial access is isolated and production-compatible", async () => {
  const password = await readFile(new URL("../app/password.ts", import.meta.url), "utf8");
  const signup = await readFile(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
  const demo = await readFile(new URL("../app/api/auth/demo/route.ts", import.meta.url), "utf8");
  const login = await readFile(new URL("../app/login/LoginClient.tsx", import.meta.url), "utf8");
  assert.match(password, /PASSWORD_HASH_ITERATIONS = 100_000/);
  assert.doesNotMatch(password, /iterations:120000/);
  assert.match(signup, /회원가입이 완료되었습니다/);
  assert.doesNotMatch(signup, /\.returning\(/);
  assert.match(demo, /demo_\$\{identifier\.slice\(0, 12\)\}/);
  assert.match(demo, /'tester'/);
  assert.match(demo, /limit: 12/);
  assert.match(demo, /await d1\.batch/);
  assert.match(demo, /setUserSessionCookie/);
  assert.match(login, /로그인 없이 바로 체험하기/);
  assert.match(login, /방문자별로 분리된 체험 계정/);
  assert.match(login, /growbook-demo-device/);
});

test("scheduled publishing has an authenticated job endpoint and atomic chapter release", async () => {
  const cron = await readFile(new URL("../app/api/cron/publish/route.ts", import.meta.url), "utf8");
  const growth = await readFile(new URL("../app/growth.ts", import.meta.url), "utf8");
  assert.match(cron, /SCHEDULED_JOB_SECRET/);
  assert.match(cron, /secret\.length < 32/);
  assert.match(cron, /ensureScheduledPostsPublished/);
  assert.match(growth, /await d1\.batch/);
  assert.match(growth, /UPDATE post_chapters/);
});
