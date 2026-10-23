import {and,desc,eq,isNull} from "drizzle-orm";
import {getDb} from "../../../db";
import {notifications} from "../../../db/schema";
import {apiError,parsePositiveId,requireApiUser} from "../utils";
export async function GET(){const auth=await requireApiUser();if(auth.error)return auth.error;try{const db=await getDb();const rows=await db.select().from(notifications).where(eq(notifications.userEmail,auth.user.email)).orderBy(desc(notifications.createdAt)).limit(100);return Response.json({notifications:rows,unread:rows.filter(item=>!item.readAt).length})}catch(error){return apiError(error)}}
export async function PATCH(request:Request){const auth=await requireApiUser();if(auth.error)return auth.error;try{const body=await request.json() as {id?:unknown;all?:unknown};const db=await getDb(),now=new Date().toISOString();if(body.all===true)await db.update(notifications).set({readAt:now}).where(and(eq(notifications.userEmail,auth.user.email),isNull(notifications.readAt)));else{const id=parsePositiveId(String(body.id||""));if(!id)return Response.json({error:"알림을 확인해 주세요."},{status:400});await db.update(notifications).set({readAt:now}).where(and(eq(notifications.id,id),eq(notifications.userEmail,auth.user.email)))}return Response.json({saved:true})}catch(error){return apiError(error)}}

