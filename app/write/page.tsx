import ProductHeader from "../components/ProductHeader";
import { requireChatGPTUser } from "../chatgpt-auth";
import EditorClient from "./EditorClient";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const user = await requireChatGPTUser("/write");

  return (
    <>
      <ProductHeader user={user} />
      <EditorClient />
    </>
  );
}
