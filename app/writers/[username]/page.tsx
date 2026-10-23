import {getChatGPTUser} from "../../chatgpt-auth";
import CommunityHeader from "../../components/CommunityHeader";
import WriterClient from "./WriterClient";
export const dynamic="force-dynamic";
export default async function WriterPage({params}:{params:Promise<{username:string}>}){const{username}=await params;return <><CommunityHeader user={await getChatGPTUser()}/><WriterClient username={username}/></>}

