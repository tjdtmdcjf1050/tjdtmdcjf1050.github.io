import {getChatGPTUser} from "../chatgpt-auth";
import CommunityHeader from "../components/CommunityHeader";
import ChallengesClient from "./ChallengesClient";
export const dynamic="force-dynamic";
export default async function ChallengesPage(){return <><CommunityHeader user={await getChatGPTUser()}/><ChallengesClient/></>}

