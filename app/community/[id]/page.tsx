import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { posts } from "../../../db/schema";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";
import CommunityHeader from "../../components/CommunityHeader";
import StoryDetailClient from "./StoryDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const{id}=await params;try{const db=await getDb();const[post]=await db.select({title:posts.title,summary:posts.summary}).from(posts).where(eq(posts.id,Number(id))).limit(1);if(!post)return{};return{title:`${post.title} | GROW BOOK`,description:post.summary,openGraph:{title:post.title,description:post.summary,images:[`/api/share/${id}`]}}}catch{return{}}}

export default async function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getChatGPTUser();
  return (
    <>
      <CommunityHeader user={user} />
      <StoryDetailClient postId={id} signInPath={chatGPTSignInPath(`/community/${id}`)} />
    </>
  );
}
