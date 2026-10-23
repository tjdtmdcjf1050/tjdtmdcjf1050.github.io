import ProductHeader from "../components/ProductHeader";
import { requireChatGPTUser } from "../chatgpt-auth";
import StudioClient from "./StudioClient";

export const dynamic="force-dynamic";
export default async function StudioPage(){const user=await requireChatGPTUser("/studio");return <><ProductHeader user={user}/><StudioClient displayName={user.displayName} isDemo={user.role === "tester"}/></>}
