import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { challengeEntries, challenges, postReactions, posts, topics } from "../../../db/schema";
import { apiError } from "../utils";

export async function GET(){try{const db=await getDb();const rows=await db.select().from(challenges).orderBy(asc(challenges.startsAt));const entries=await db.select({challengeId:challengeEntries.challengeId,postId:posts.id,title:posts.title,summary:posts.summary,authorName:posts.authorName,topicName:topics.name,topicColor:topics.color,status:challengeEntries.status,purchaseCount:sql<number>`(select count(*) from ${postReactions} where ${postReactions.postId}=${posts.id} and ${postReactions.type}='purchase')`,likeCount:sql<number>`(select count(*) from ${postReactions} where ${postReactions.postId}=${posts.id} and ${postReactions.type}='like')`}).from(challengeEntries).innerJoin(posts,eq(challengeEntries.postId,posts.id)).innerJoin(topics,eq(posts.topicId,topics.id)).where(eq(posts.status,"published"));return Response.json({challenges:rows.map(challenge=>({...challenge,entries:entries.filter(entry=>entry.challengeId===challenge.id)}))})}catch(error){return apiError(error)}}

