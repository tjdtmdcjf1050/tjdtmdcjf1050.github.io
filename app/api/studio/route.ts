import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  comments, eventApplications, events, financialEntries, postMetrics, posts,
  publicationAttempts, publicationCandidates, topics, workSeries,
} from "../../../db/schema";
import { ensureScheduledPostsPublished, startPublishingChallenge } from "../../growth";
import { apiError, parsePositiveId, requireApiUser } from "../utils";

const WORK_STATUSES = new Set(["preparing", "ongoing", "paused", "completed"]);
const VISIBILITIES = new Set(["public", "private", "preview"]);
const EVENT_TYPES = new Set(["lecture", "popup", "portfolio"]);

function parseFutureDate(value: unknown) {
  const parsed = new Date(String(value || ""));
  return Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now() ? parsed.toISOString() : null;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  try {
    await ensureScheduledPostsPublished();
    const db = await getDb();
    const works = await db.select({
      id:posts.id,title:posts.title,summary:posts.summary,status:posts.status,workStatus:posts.workStatus,visibility:posts.visibility,
      coverImage:posts.coverImage,topicName:topics.name,topicColor:topics.color,updatedAt:posts.updatedAt,publishedAt:posts.publishedAt,scheduledAt:posts.scheduledAt,deletedAt:posts.deletedAt,
      seriesId:posts.seriesId,seriesTitle:workSeries.title,seriesOrder:posts.seriesOrder,publishChallenge:posts.publishChallenge,
      candidateStatus:publicationCandidates.status,candidateScore:publicationCandidates.score,attemptNumber:publicationCandidates.attemptNumber,eligibleAgainAt:publicationCandidates.eligibleAgainAt,decisionReason:publicationCandidates.decisionReason,
      readers:sql<number>`coalesce(${postMetrics.readerCount},0)`,
      completions:sql<number>`coalesce(${postMetrics.completionCount},0)`,
      likes:sql<number>`coalesce(${postMetrics.likeCount},0)`,
      purchases:sql<number>`coalesce(${postMetrics.purchaseCount},0)`,
      recommends:sql<number>`coalesce(${postMetrics.recommendCount},0)`,
      comments:sql<number>`coalesce(${postMetrics.commentCount},0)`,
      sponsorshipAmount:sql<number>`coalesce(${postMetrics.sponsorAmount},0)`,
    }).from(posts).innerJoin(topics,eq(posts.topicId,topics.id)).leftJoin(workSeries,eq(posts.seriesId,workSeries.id)).leftJoin(publicationCandidates,eq(publicationCandidates.postId,posts.id)).leftJoin(postMetrics,eq(postMetrics.postId,posts.id))
      .where(eq(posts.ownerEmail,auth.user.email)).orderBy(desc(posts.updatedAt));
    const series = await db.select({
      id:workSeries.id,title:workSeries.title,description:workSeries.description,status:workSeries.status,updatedAt:workSeries.updatedAt,
      workCount:sql<number>`(select count(*) from ${posts} where ${posts.seriesId}=${workSeries.id} and ${posts.deletedAt} is null)`,
    }).from(workSeries).where(eq(workSeries.ownerEmail,auth.user.email)).orderBy(desc(workSeries.updatedAt));
    const recentComments = await db.select({id:comments.id,postId:posts.id,postTitle:posts.title,userDisplayName:comments.userDisplayName,content:comments.content,createdAt:comments.createdAt})
      .from(comments).innerJoin(posts,eq(comments.postId,posts.id)).where(eq(posts.ownerEmail,auth.user.email)).orderBy(desc(comments.createdAt)).limit(50);
    const myEvents = await db.select({id:events.id,type:events.type,title:events.title,summary:events.summary,venue:events.venue,startsAt:events.startsAt,capacity:events.capacity,fee:events.fee,status:events.status,adminNote:events.adminNote,
      applicants:sql<number>`(select count(*) from ${eventApplications} where ${eventApplications.eventId}=${events.id} and ${eventApplications.status}!='cancelled')`})
      .from(events).where(eq(events.ownerEmail,auth.user.email)).orderBy(desc(events.startsAt));
    const finances = await db.select().from(financialEntries).where(eq(financialEntries.ownerEmail,auth.user.email)).orderBy(desc(financialEntries.occurredAt)).limit(100);
    const attempts = await db.select({postId:publicationAttempts.postId,attemptNumber:publicationAttempts.attemptNumber,startsAt:publicationAttempts.startsAt,endsAt:publicationAttempts.endsAt,targetCount:publicationAttempts.targetCount,score:publicationAttempts.score,status:publicationAttempts.status,resultReason:publicationAttempts.resultReason})
      .from(publicationAttempts).innerJoin(posts,eq(publicationAttempts.postId,posts.id)).where(eq(posts.ownerEmail,auth.user.email)).orderBy(desc(publicationAttempts.id));
    return Response.json({works,series,comments:recentComments,events:myEvents,finances,attempts});
  } catch(error){return apiError(error)}
}

export async function POST(request:Request){
  const auth=await requireApiUser();if(auth.error)return auth.error;
  try{
    const body=await request.json() as Record<string,unknown>;const action=String(body.action||"");const db=await getDb();const now=new Date().toISOString();
    if(action==="series"){
      const title=String(body.title||"").trim().slice(0,80),description=String(body.description||"").trim().slice(0,240);if(title.length<2)return Response.json({error:"시리즈 제목을 입력해 주세요."},{status:400});
      const [series]=await db.insert(workSeries).values({ownerEmail:auth.user.email,title,description}).returning();return Response.json({series},{status:201});
    }
    if(action==="event"){
      const type=String(body.type||"lecture"),title=String(body.title||"").trim().slice(0,100),summary=String(body.summary||"").trim().slice(0,500),venue=String(body.venue||"").trim().slice(0,120),startsAt=parseFutureDate(body.startsAt),capacity=Math.min(500,Math.max(2,Math.round(Number(body.capacity)||20))),fee=Math.min(1000000,Math.max(0,Math.round(Number(body.fee)||0)));
      if(!EVENT_TYPES.has(type)||title.length<2||!venue||!startsAt)return Response.json({error:"행사 종류·제목·장소·일정을 확인해 주세요."},{status:400});
      const [event]=await db.insert(events).values({ownerEmail:auth.user.email,ownerName:auth.user.displayName,type,title,summary,venue,startsAt,capacity,fee,status:"submitted",updatedAt:now}).returning();return Response.json({event},{status:201});
    }
    if(action==="reattempt"){
      const postId=parsePositiveId(String(body.postId||""));if(!postId)return Response.json({error:"작품을 확인해 주세요."},{status:400});
      const [work]=await db.select({id:posts.id,purchaseGoal:posts.purchaseGoal}).from(posts).leftJoin(publicationCandidates,eq(publicationCandidates.postId,posts.id)).where(and(eq(posts.id,postId),eq(posts.ownerEmail,auth.user.email),isNull(posts.deletedAt))).limit(1);if(!work)return Response.json({error:"작품을 찾을 수 없습니다."},{status:404});
      await db.update(posts).set({publishChallenge:true,updatedAt:now}).where(eq(posts.id,postId));const candidate=await startPublishingChallenge(postId,work.purchaseGoal,true);return Response.json({candidate});
    }
    return Response.json({error:"지원하지 않는 요청입니다."},{status:400});
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request){
  const auth=await requireApiUser();if(auth.error)return auth.error;
  try{
    const body=await request.json() as Record<string,unknown>;const action=String(body.action||"");const id=parsePositiveId(String(body.id||""));if(!id)return Response.json({error:"대상을 확인해 주세요."},{status:400});const db=await getDb();const now=new Date().toISOString();
    if(action==="trash"||action==="restore"){
      await db.update(posts).set({deletedAt:action==="trash"?now:null,updatedAt:now}).where(and(eq(posts.id,id),eq(posts.ownerEmail,auth.user.email)));return Response.json({saved:true});
    }
    if(action==="work"){
      const workStatus=String(body.workStatus||""),visibility=String(body.visibility||"");const seriesId=parsePositiveId(String(body.seriesId||""));const seriesOrder=Math.min(999,Math.max(0,Math.round(Number(body.seriesOrder)||0)));
      if(!WORK_STATUSES.has(workStatus)||!VISIBILITIES.has(visibility))return Response.json({error:"작품 상태와 공개 범위를 확인해 주세요."},{status:400});
      if(seriesId){const [series]=await db.select({id:workSeries.id}).from(workSeries).where(and(eq(workSeries.id,seriesId),eq(workSeries.ownerEmail,auth.user.email))).limit(1);if(!series)return Response.json({error:"시리즈를 찾을 수 없습니다."},{status:404});}
      await db.update(posts).set({workStatus,visibility,seriesId,seriesOrder,updatedAt:now}).where(and(eq(posts.id,id),eq(posts.ownerEmail,auth.user.email)));return Response.json({saved:true});
    }
    if(action==="schedule"){
      const scheduledAt=parseFutureDate(body.scheduledAt);if(!scheduledAt)return Response.json({error:"현재보다 이후의 시간을 선택해 주세요."},{status:400});
      await db.update(posts).set({status:"scheduled",scheduledAt,publishedAt:null,updatedAt:now}).where(and(eq(posts.id,id),eq(posts.ownerEmail,auth.user.email),isNull(posts.deletedAt)));return Response.json({saved:true});
    }
    if(action==="cancelSchedule"){
      await db.update(posts).set({status:"draft",scheduledAt:null,updatedAt:now}).where(and(eq(posts.id,id),eq(posts.ownerEmail,auth.user.email)));return Response.json({saved:true});
    }
    if(action==="series"){
      const title=String(body.title||"").trim().slice(0,80),description=String(body.description||"").trim().slice(0,240),status=String(body.status||"ongoing");if(title.length<2)return Response.json({error:"시리즈 제목을 입력해 주세요."},{status:400});
      await db.update(workSeries).set({title,description,status,updatedAt:now}).where(and(eq(workSeries.id,id),eq(workSeries.ownerEmail,auth.user.email)));return Response.json({saved:true});
    }
    return Response.json({error:"지원하지 않는 요청입니다."},{status:400});
  }catch(error){return apiError(error)}
}
