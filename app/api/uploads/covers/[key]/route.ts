type StoredObject = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  etag?: string;
};
type Bucket = { get(key: string): Promise<StoredObject | null> };

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const key = decodeURIComponent((await context.params).key || "");
  if (!/^(cover|profile)-[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(key))
    return new Response("Not found", { status: 404 });
  const { env } = await import("cloudflare:workers");
  const bucket = (env as unknown as { BUCKET?: Bucket }).BUCKET;
  if (!bucket) return new Response("Storage unavailable", { status: 503 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(object.etag ? { ETag: object.etag } : {}),
    },
  });
}
