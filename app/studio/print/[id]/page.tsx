import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { postChapters, posts } from "../../../../db/schema";
import { requireChatGPTUser } from "../../../chatgpt-auth";

export const dynamic="force-dynamic";
export default async function PrintWorkPage({params}:{params:Promise<{id:string}>}){const user=await requireChatGPTUser("/studio");const id=Number((await params).id);const db=await getDb();const[post]=await db.select().from(posts).where(and(eq(posts.id,id),eq(posts.ownerEmail,user.email),isNull(posts.deletedAt))).limit(1);if(!post)return <main className="print-manuscript"><h1>작품을 찾을 수 없습니다.</h1></main>;const chapters=await db.select().from(postChapters).where(eq(postChapters.postId,id)).orderBy(asc(postChapters.position));return <main className="print-manuscript"><header><small>GROW BOOK MANUSCRIPT</small><h1>{post.title}</h1><p>{post.summary}</p><span>{post.authorName}</span></header>{chapters.map((chapter,index)=><article key={chapter.id}><small>{String(index+1).padStart(2,"0")}</small><h2>{chapter.title||`${index+1}장`}</h2>{chapter.content.split(/\n{2,}/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</article>)}<footer>브라우저의 인쇄 메뉴에서 ‘PDF로 저장’을 선택하세요.</footer><script dangerouslySetInnerHTML={{__html:"setTimeout(()=>window.print(),500)"}}/></main>}
