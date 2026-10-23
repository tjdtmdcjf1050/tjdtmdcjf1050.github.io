import CommunityHeader from "../components/CommunityHeader";
import { getChatGPTUser } from "../chatgpt-auth";
import EventsClient from "./EventsClient";
export const dynamic="force-dynamic";
export default async function EventsPage(){return <><CommunityHeader user={await getChatGPTUser()}/><EventsClient/></>}
