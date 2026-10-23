import assert from "node:assert/strict";
import test from "node:test";

let worker;

test.before(async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  worker = (await import(workerUrl.href)).default;
});

async function render(path) {
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders production title and description metadata", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>GROW BOOK \| 이야기가 책으로 자라는 곳<\/title>/i);
  assert.match(html, /<meta[^>]+name=["']description["']/i);
});

for (const [path, marker] of [
  ["/community", "작품 둘러보기"],
  ["/", "GROW BOOK이 하는 일"],
  ["/about", "4 STEP BOOKSHELF"],
  ["/events", "행사"],
  ["/rankings", "출판 도전 랭킹"],
  ["/login", "로그인 없이 바로 체험하기"],
]) {
  test(`renders ${path} without a server error`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(marker));
  });
}

for (const path of ["/write", "/studio", "/notifications"]) {
  test(`protects ${path} behind member sign-in`, async () => {
    const response = await render(path);
    assert.ok([301, 302, 303, 307, 308].includes(response.status));
    assert.match(response.headers.get("location") ?? "", /\/login\?returnTo=/);
  });
}

test("legacy account route redirects into the unified personal space", async () => {
  const response = await render("/account");
  assert.ok([301, 302, 303, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/studio\?tab=profile$/);
});

test("legacy dashboard route redirects into the unified personal space", async () => {
  const response = await render("/dashboard");
  assert.ok([301, 302, 303, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/studio$/);
});
