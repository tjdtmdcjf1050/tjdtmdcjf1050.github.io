import CommunityHeader from "../components/CommunityHeader";
import { getChatGPTUser } from "../chatgpt-auth";
import ImpactClient from "./ImpactClient";
export const dynamic="force-dynamic";
export default async function ImpactPage(){return <><CommunityHeader user={await getChatGPTUser()}/><ImpactClient/></>}
