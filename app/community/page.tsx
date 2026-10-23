import { getChatGPTUser } from "../chatgpt-auth";
import CommunityHeader from "../components/CommunityHeader";
import CommunityClient from "./CommunityClient";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getChatGPTUser();
  return (
    <>
      <CommunityHeader user={user} />
      <CommunityClient />
    </>
  );
}
