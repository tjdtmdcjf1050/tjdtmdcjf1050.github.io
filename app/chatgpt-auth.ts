import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { userSessions, users } from "../db/schema";

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null; username: string; role: string };
const COOKIE = "growbook_session";

export async function getSessionUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { const db=await getDb(); const [row]=await db.select({displayName:users.displayName,email:users.email,username:users.username,role:users.role}).from(userSessions).innerJoin(users,eq(userSessions.userId,users.id)).where(and(eq(userSessions.token,token),gt(userSessions.expiresAt,new Date().toISOString()))).limit(1); return row?{...row,fullName:row.displayName}:null; } catch { return null; }
}
export async function getChatGPTUser(): Promise<ChatGPTUser | null> { return getSessionUser(); }
export async function requireChatGPTUser(returnTo:string){const user=await getSessionUser();if(!user)redirect(chatGPTSignInPath(returnTo));return user;}
export function chatGPTSignInPath(returnTo:string){return `/login?returnTo=${encodeURIComponent(safePath(returnTo))}`;}
export function chatGPTSignOutPath(returnTo="/"){return `/api/auth/logout?returnTo=${encodeURIComponent(safePath(returnTo))}`;}
function safePath(value:string){return value.startsWith("/")&&!value.startsWith("//")?value:"/";}
export function createSessionToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
export function sessionExpiry(){return new Date(Date.now()+1000*60*60*24*30).toISOString();}
export async function setUserSessionCookie(token:string){(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});}
export async function createUserSession(userId:number){const token=createSessionToken();const expiresAt=sessionExpiry();const db=await getDb();await db.insert(userSessions).values({token,userId,expiresAt});await setUserSessionCookie(token);}
export async function clearUserSession(){const store=await cookies();const token=store.get(COOKIE)?.value;if(token){try{await (await getDb()).delete(userSessions).where(eq(userSessions.token,token));}catch{}}store.delete(COOKIE);}
