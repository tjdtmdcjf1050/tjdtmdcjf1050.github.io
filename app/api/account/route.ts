import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  bookmarks,
  follows,
  posts,
  profiles,
  reports,
} from "../../../db/schema";
import { apiError, requireApiUser } from "../utils";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const db = await getDb();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, auth.user.email))
      .limit(1);
    const saved = await db
      .select({ id: posts.id, title: posts.title })
      .from(bookmarks)
      .innerJoin(posts, eq(bookmarks.postId, posts.id))
      .where(eq(bookmarks.userEmail, auth.user.email))
      .orderBy(desc(bookmarks.createdAt))
      .limit(30);
    const [followCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerEmail, auth.user.email));
    const [reportCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.reporterEmail, auth.user.email));

    return Response.json({
      username: auth.user.username,
      profile: profile || {
        displayName: auth.user.displayName,
        profileImage: "",
        headline: "",
        bio: "",
        interests: "",
        portfolioPublic: true,
      },
      bookmarks: saved,
      follows: Number(followCount?.count || 0),
      reports: Number(reportCount?.count || 0),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = String(body.displayName || auth.user.displayName)
      .trim()
      .slice(0, 40);
    const requestedProfileImage = String(body.profileImage || "")
      .trim()
      .slice(0, 500);
    const profileImage =
      /^\/api\/uploads\/covers\/profile-[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(
        requestedProfileImage,
      )
        ? requestedProfileImage
        : "";
    const headline = String(body.headline || "")
      .trim()
      .slice(0, 100);
    const bio = String(body.bio || "")
      .trim()
      .slice(0, 300);
    const interests = String(body.interests || "")
      .trim()
      .slice(0, 150);
    const portfolioPublic = body.portfolioPublic !== false;
    const db = await getDb();
    await db
      .insert(profiles)
      .values({
        email: auth.user.email,
        displayName,
        profileImage,
        headline,
        bio,
        interests,
        portfolioPublic,
      })
      .onConflictDoUpdate({
        target: profiles.email,
        set: {
          displayName,
          profileImage,
          headline,
          bio,
          interests,
          portfolioPublic,
          updatedAt: new Date().toISOString(),
        },
      });
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
