import {requireChatGPTUser} from "../chatgpt-auth";
import ProductHeader from "../components/ProductHeader";
import NotificationsClient from "./NotificationsClient";
export const dynamic="force-dynamic";
export default async function NotificationsPage(){const user=await requireChatGPTUser("/notifications");return <><ProductHeader user={user}/><NotificationsClient/></>}

