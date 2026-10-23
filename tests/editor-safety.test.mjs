import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";

async function loadSnapshotModule() {
  const source = await readFile(new URL("../app/post-snapshot.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

async function loadTypescriptModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("revision snapshots preserve every publishing and manuscript setting", async () => {
  const { postSnapshot, serializePostSnapshot, parsePostSnapshot } =
    await loadSnapshotModule();
  const original = postSnapshot({
    title: "완전한 버전",
    summary: "모든 설정을 함께 보관합니다.",
    content: "열 글자가 넘는 안전한 테스트 원고입니다.",
    categoryId: 7,
    topicId: 3,
    format: "novel",
    workStatus: "completed",
    visibility: "preview",
    publishChallenge: true,
    sponsorshipEnabled: false,
    commentsEnabled: false,
    purchaseGoal: 850,
    tags: "성장,회복",
    seriesTitle: "나의 기록",
    seriesId: 9,
    seriesOrder: 4,
    scheduledAt: "2026-08-01T03:00:00.000Z",
    coverImage: "/covers/test.webp",
    fontFamily: "classic",
    fontSize: 21,
    lineHeight: 210,
    status: "scheduled",
  });
  assert.deepEqual(parsePostSnapshot(serializePostSnapshot(original), original), original);
});

test("corrupt legacy snapshot safely falls back to stored revision fields", async () => {
  const { parsePostSnapshot } = await loadSnapshotModule();
  const fallback = { title: "복구", content: "안전하게 복구되는 충분한 본문", categoryId: 2 };
  const restored = parsePostSnapshot("{broken", fallback);
  assert.equal(restored.title, fallback.title);
  assert.equal(restored.categoryId, fallback.categoryId);
  assert.equal(restored.visibility, "public");
});

test("safe publishing migration creates versions, full snapshots and server drafts", async () => {
  const migration = await readFile(
    new URL("../drizzle/0010_safe_publishing_workflow.sql", import.meta.url),
    "utf8",
  );
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("CREATE TABLE posts (id INTEGER PRIMARY KEY, owner_email TEXT NOT NULL)");
  db.exec("CREATE TABLE post_revisions (id INTEGER PRIMARY KEY)");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
  const postColumns = db.prepare("PRAGMA table_info(posts)").all().map((row) => row.name);
  const revisionColumns = db.prepare("PRAGMA table_info(post_revisions)").all().map((row) => row.name);
  const draftColumns = db.prepare("PRAGMA table_info(post_drafts)").all().map((row) => row.name);
  assert.ok(postColumns.includes("version"));
  assert.ok(postColumns.includes("write_token"));
  assert.ok(revisionColumns.includes("snapshot"));
  assert.deepEqual(
    ["post_id", "snapshot", "base_version", "draft_version", "state"].every((name) =>
      draftColumns.includes(name),
    ),
    true,
  );
});

test("security migration creates indexed authentication-attempt storage", async () => {
  const migration = await readFile(
    new URL("../drizzle/0011_security_and_operations.sql", import.meta.url),
    "utf8",
  );
  const db = new DatabaseSync(":memory:");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
  const columns = db
    .prepare("PRAGMA table_info(auth_attempts)")
    .all()
    .map((row) => row.name);
  const indexes = db
    .prepare("PRAGMA index_list(auth_attempts)")
    .all()
    .map((row) => row.name);
  assert.deepEqual(
    ["scope", "identifier", "attempted_at"].every((name) => columns.includes(name)),
    true,
  );
  assert.ok(indexes.includes("auth_attempts_lookup_idx"));
});

test("cover validation checks actual image bytes and safe dimensions", async () => {
  const { validateImageBytes } = await loadTypescriptModule("../app/image-validation.ts");
  const png = (width, height) => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(bytes.buffer).setUint32(16, width);
    new DataView(bytes.buffer).setUint32(20, height);
    return bytes.buffer;
  };
  assert.deepEqual(validateImageBytes(png(640, 800), "image/png"), {
    valid: true,
    width: 640,
    height: 800,
  });
  assert.equal(validateImageBytes(png(32, 32), "image/png").valid, false);
  assert.equal(validateImageBytes(png(640, 800), "image/jpeg").valid, false);
});

test("post metrics migration backfills and maintains aggregate counts", async () => {
  const migration = await readFile(
    new URL("../drizzle/0012_post_metrics.sql", import.meta.url),
    "utf8",
  );
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  db.exec("CREATE TABLE posts(id INTEGER PRIMARY KEY)");
  db.exec("CREATE TABLE post_reactions(id INTEGER PRIMARY KEY,post_id INTEGER,type TEXT)");
  db.exec("CREATE TABLE bookmarks(id INTEGER PRIMARY KEY,post_id INTEGER)");
  db.exec("CREATE TABLE reading_history(id INTEGER PRIMARY KEY,post_id INTEGER)");
  db.exec("CREATE TABLE reading_progress(id INTEGER PRIMARY KEY,post_id INTEGER,completed INTEGER)");
  db.exec("CREATE TABLE comments(id INTEGER PRIMARY KEY,post_id INTEGER)");
  db.exec("CREATE TABLE sponsorships(id INTEGER PRIMARY KEY,post_id INTEGER,amount INTEGER)");
  db.exec("INSERT INTO posts(id) VALUES(1)");
  db.exec("INSERT INTO post_reactions(post_id,type) VALUES(1,'like'),(1,'purchase')");
  db.exec("INSERT INTO sponsorships(post_id,amount) VALUES(1,5000)");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
  assert.deepEqual(
    { ...db.prepare("SELECT like_count,purchase_count,sponsor_count,sponsor_amount FROM post_metrics WHERE post_id=1").get() },
    { like_count: 1, purchase_count: 1, sponsor_count: 1, sponsor_amount: 5000 },
  );
  db.exec("INSERT INTO post_reactions(post_id,type) VALUES(1,'recommend')");
  db.exec("INSERT INTO reading_progress(post_id,completed) VALUES(1,1)");
  db.exec("UPDATE sponsorships SET amount=7000 WHERE post_id=1");
  assert.deepEqual(
    { ...db.prepare("SELECT recommend_count,completion_count,sponsor_amount FROM post_metrics WHERE post_id=1").get() },
    { recommend_count: 1, completion_count: 1, sponsor_amount: 7000 },
  );
});

test("discovery indexes cover public status, topic and format filters", async () => {
  const migration = await readFile(
    new URL("../drizzle/0013_discovery_indexes.sql", import.meta.url),
    "utf8",
  );
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE posts(id INTEGER PRIMARY KEY,status TEXT,visibility TEXT,deleted_at TEXT,published_at TEXT,topic_id INTEGER,format TEXT,work_status TEXT)");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
  const indexes = db.prepare("PRAGMA index_list(posts)").all().map((row) => row.name);
  for (const name of ["posts_discovery_idx", "posts_discovery_topic_idx", "posts_format_status_idx"])
    assert.ok(indexes.includes(name));
});
