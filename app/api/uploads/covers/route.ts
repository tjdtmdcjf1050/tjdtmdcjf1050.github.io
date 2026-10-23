import { requireApiUser } from "../../utils";
import { validateImageBytes } from "../../../image-validation";

type Bucket = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
};

function extension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const purpose = form.get("purpose") === "profile" ? "profile" : "cover";
    if (!(file instanceof File))
      return Response.json(
        { error: "이미지 파일을 선택해 주세요." },
        { status: 400 },
      );
    if (
      !new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(
        file.type,
      )
    )
      return Response.json(
        { error: "JPG, PNG, WEBP, GIF 이미지만 사용할 수 있습니다." },
        { status: 400 },
      );
    if (file.size > 4 * 1024 * 1024)
      return Response.json(
        { error: "이미지는 4MB 이하로 올려 주세요." },
        { status: 400 },
      );
    const { env } = await import("cloudflare:workers");
    const bucket = (env as unknown as { BUCKET?: Bucket }).BUCKET;
    if (!bucket)
      return Response.json(
        { error: "파일 저장소가 준비되지 않았습니다." },
        { status: 503 },
      );
    const bytes = await file.arrayBuffer();
    const validation = validateImageBytes(bytes, file.type);
    if (!validation.valid)
      return Response.json({ error: validation.error }, { status: 400 });
    const key = `${purpose}-${crypto.randomUUID()}.${extension(file.type)}`;
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });
    return Response.json({
      url: `/api/uploads/covers/${encodeURIComponent(key)}`,
      key,
      name: file.name,
      width: validation.width,
      height: validation.height,
    });
  } catch {
    return Response.json(
      { error: "이미지를 업로드하지 못했습니다." },
      { status: 500 },
    );
  }
}
