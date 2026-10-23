import { getChatGPTUser } from "../chatgpt-auth";
import CommunityHeader from "../components/CommunityHeader";
import RankingsClient from "./RankingsClient";
export const dynamic="force-dynamic";
export default async function RankingsPage(){return <><CommunityHeader user={await getChatGPTUser()}/><RankingsClient/></>}

